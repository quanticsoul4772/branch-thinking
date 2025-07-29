import { createHash } from 'crypto';
import { 
  ThoughtData, 
  BranchNode, 
  ThoughtEvent, 
  EventType,
  BranchingThoughtInput,
  CrossReference,
  CrossRefType,
  Insight,
  ProcessedText
} from './types.js';
import { ContradictionBloomFilter } from './bloomFilter.js';
import { SimilarityMatrix } from './sparseMatrix.js';
import { CircularReasoningDetector } from './circularReasoningDetector.js';
import { getConfig } from './config.js';
import { semanticProfileManager } from './semanticProfile.js';
import { BranchGraphStorage } from './utils/BranchGraphStorage.js';
import { BranchGraphSearch } from './utils/BranchGraphSearch.js';
import { BranchGraphAnalytics } from './utils/BranchGraphAnalytics.js';

export interface AddThoughtParams {
  content: string;
  branchId?: string;
  type: string;
  confidence?: number;
  keyPoints?: string[];
  parentBranchId?: string;
  crossRefs?: Array<{
    toBranch: string;
    type: CrossRefType;
    reason: string;
    strength: number;
  }>;
}

export interface AddThoughtResult {
  thoughtId: string;
  overlapWarning?: {
    suggestedBranch: string;
    currentSimilarity: number;
    suggestedSimilarity: number;
  };
}

export class BranchGraph {
  private storage: BranchGraphStorage;
  private search: BranchGraphSearch;
  private analytics: BranchGraphAnalytics;
  
  // Phase 4 Optimizations
  private contradictionFilter: ContradictionBloomFilter;
  private similarityMatrix: SimilarityMatrix;
  private circularDetector: CircularReasoningDetector;
  
  // Counters for ID generation
  private branchCounter = 0;
  private eventCounter = 0;
  
  constructor() {
    // Initialize components
    this.storage = new BranchGraphStorage();
    this.search = new BranchGraphSearch(this.storage);
    this.analytics = new BranchGraphAnalytics(this.storage);
    
    // Initialize Phase 4 components
    this.contradictionFilter = new ContradictionBloomFilter();
    this.similarityMatrix = new SimilarityMatrix(getConfig().matrix.similarityThreshold);
    this.circularDetector = new CircularReasoningDetector();
  }

  /**
   * Add a thought to the graph
   */
  async addThought(input: BranchingThoughtInput): Promise<AddThoughtResult> {
    const params = this.prepareAddThoughtParams(input);
    const { thoughtId, actualBranchId } = await this.createThought(params);
    
    // Update semantic profile
    await this.updateSemanticProfile(actualBranchId, params.content, thoughtId);
    
    // Check for overlap warning
    const overlapWarning = await this.checkOverlapWarning(actualBranchId, params.content);
    
    // Phase 4 updates
    this.performPhase4Updates(thoughtId, params.content, params.crossRefs);
    
    // Record event
    this.recordThoughtAddedEvent(thoughtId, actualBranchId);
    
    // Handle cross-references
    this.processCrossReferences(actualBranchId, params.crossRefs, thoughtId);
    
    return { thoughtId, overlapWarning };
  }

  private prepareAddThoughtParams(input: BranchingThoughtInput): AddThoughtParams {
    return {
      content: input.content,
      branchId: input.branchId,
      type: input.type,
      confidence: input.confidence || 1.0,
      keyPoints: input.keyPoints || [],
      parentBranchId: input.parentBranchId,
      crossRefs: input.crossRefs
    };
  }

  private async createThought(params: AddThoughtParams): Promise<{ thoughtId: string; actualBranchId: string }> {
    const actualBranchId = this.ensureBranch(params.branchId, params.parentBranchId);
    const thoughtId = this.computeHash(params.content);
    
    await this.storage.createThoughtIfNew({
      thoughtId,
      content: params.content,
      branchId: actualBranchId,
      type: params.type,
      confidence: params.confidence!,
      keyPoints: params.keyPoints!
    });
    
    this.storage.addThoughtToBranch(thoughtId, actualBranchId);
    
    return { thoughtId, actualBranchId };
  }

  /**
   * Generate content hash for deduplication
   */
  private computeHash(content: string): string {
    return createHash('sha256').update(content).digest('hex').substring(0, getConfig().hash.substringLength);
  }

  /**
   * Ensure branch exists or create it
   */
  private ensureBranch(branchId?: string, parentBranchId?: string): string {
    if (!branchId) {
      return this.createBranch(parentBranchId);
    }
    
    if (!this.storage.hasBranch(branchId)) {
      this.createBranchWithId(branchId, parentBranchId);
    }
    
    return branchId;
  }

  /**
   * Update semantic profile for branch
   */
  private async updateSemanticProfile(branchId: string, content: string, thoughtId: string): Promise<void> {
    const branch = this.storage.getBranch(branchId);
    if (!branch) return;
    
    await semanticProfileManager.updateBranchProfile(branch, content, thoughtId);
  }

  /**
   * Check for overlap warning with other branches
   */
  private async checkOverlapWarning(
    currentBranchId: string,
    content: string
  ): Promise<AddThoughtResult['overlapWarning']> {
    const currentBranch = this.storage.getBranch(currentBranchId);
    if (!currentBranch?.semanticProfile) return undefined;
    
    const allBranches = this.storage.getAllBranches();
    const { branch: mostSimilarBranch, similarity: maxSimilarity } = 
      await semanticProfileManager.findMostSimilarBranch(content, allBranches, currentBranchId);
    
    if (!mostSimilarBranch) return undefined;
    
    const currentSimilarity = await semanticProfileManager.calculateThoughtToBranchSimilarity(
      content, 
      currentBranch
    );
    
    // Only warn if significantly more similar to another branch
    if (maxSimilarity <= currentSimilarity + 0.15) return undefined;
    
    return {
      suggestedBranch: mostSimilarBranch.id,
      currentSimilarity,
      suggestedSimilarity: maxSimilarity
    };
  }

  /**
   * Perform Phase 4 updates
   */
  private performPhase4Updates(
    thoughtId: string, 
    content: string, 
    crossRefs?: AddThoughtParams['crossRefs']
  ): void {
    // Check for contradictions
    this.contradictionFilter.checkAndAdd(content);
    
    // Add to circular reasoning detector
    const referencedThoughts = crossRefs?.map(ref => ref.toBranch) || [];
    this.circularDetector.addThought(thoughtId, content, referencedThoughts);
    
    // Register in similarity matrix
    this.similarityMatrix.registerThought(thoughtId);
  }

  /**
   * Record thought added event
   */
  private recordThoughtAddedEvent(thoughtId: string, branchId: string): void {
    this.storage.recordEvent({
      type: 'thought_added',
      thoughtId,
      branchId,
      timestamp: Date.now(),
      index: this.eventCounter++
    });
  }

  /**
   * Process cross-references
   */
  private processCrossReferences(
    branchId: string,
    crossRefs: AddThoughtParams['crossRefs'],
    thoughtId: string
  ): void {
    if (!crossRefs) return;
    
    crossRefs.forEach(ref => {
      this.addCrossReference({
        fromBranch: branchId,
        toBranch: ref.toBranch,
        type: ref.type,
        strength: ref.strength,
        thoughtId
      });
    });
  }

  /**
   * Create a new branch
   */
  createBranch(parentBranchId?: string): string {
    const branchId = `branch-${++this.branchCounter}`;
    this.createBranchWithId(branchId, parentBranchId);
    return branchId;
  }
  
  /**
   * Create a branch with a specific ID
   */
  createBranchWithId(branchId: string, parentBranchId?: string): void {
    this.storage.createBranch(branchId, parentBranchId);
    
    this.storage.recordEvent({
      type: 'branch_created',
      branchId,
      timestamp: Date.now(),
      index: this.eventCounter++,
      data: { parentBranchId }
    });
  }

  /**
   * Add cross-reference between branches
   */
  private addCrossReference(params: {
    fromBranch: string;
    toBranch: string;
    type: string;
    strength: number;
    thoughtId: string;
  }): void {
    this.storage.recordEvent({
      type: 'cross_ref_added',
      timestamp: Date.now(),
      index: this.eventCounter++,
      data: params
    });
  }

  // Delegate methods to components
  getEventsSince(index: number): ThoughtEvent[] {
    return this.storage.getEventsSince(index);
  }

  getThought(thoughtId: string): ThoughtData | undefined {
    return this.storage.getThought(thoughtId);
  }

  getBranch(branchId: string): BranchNode | undefined {
    return this.storage.getBranch(branchId);
  }

  getAllBranches(): BranchNode[] {
    return this.storage.getAllBranches();
  }

  getRecentThoughts(branchId: string, count: number): ThoughtData[] {
    return this.storage.getRecentThoughts(branchId, count);
  }

  // Search methods
  breadthFirstSearch(startBranchId: string, maxDepth: number): Set<string> {
    return this.search.breadthFirstSearch(startBranchId, maxDepth);
  }

  searchThoughts(pattern: RegExp): { thoughtId: string; branchId: string }[] {
    return this.search.searchThoughts(pattern);
  }

  // Analytics methods
  getStatistics(): any {
    return {
      ...this.analytics.getBasicStats(),
      contradictionFilterStats: this.contradictionFilter.getStats(),
      similarityMatrixStats: this.similarityMatrix.getStats(),
      circularReasoningStats: this.circularDetector.getStats()
    };
  }

  // Phase 4 methods
  calculateSimilarity(thoughtId1: string, thoughtId2: string): number {
    const thought1 = this.storage.getThought(thoughtId1);
    const thought2 = this.storage.getThought(thoughtId2);
    
    if (!thought1 || !thought2) return 0;
    
    // Check cache first
    const cached = this.similarityMatrix.getSimilarity(thoughtId1, thoughtId2);
    if (cached > 0) return cached;
    
    // Calculate new similarity
    const similarity = this.analytics.computeCosineSimilarity(thought1.content, thought2.content);
    
    // Store in sparse matrix
    this.similarityMatrix.setSimilarity(thoughtId1, thoughtId2, similarity);
    
    return similarity;
  }

  getMostSimilarThoughts(thoughtId: string, topK: number = 5): { thoughtId: string; similarity: number }[] {
    return this.similarityMatrix.getMostSimilar(thoughtId, topK);
  }

  detectCircularReasoning(): any {
    return this.circularDetector.detectAllPatterns();
  }

  getThoughtClusters(minSimilarity: number = getConfig().matrix.clusteringMinSimilarity): string[][] {
    return this.similarityMatrix.getClusters(minSimilarity);
  }

  // Legacy compatibility
  toLegacyBranch(branchId: string): any {
    return this.storage.toLegacyBranch(branchId);
  }

  // Semantic profile methods
  compareProfiles(): any {
    return this.analytics.compareProfiles();
  }

  async suggestMerges(): Promise<any> {
    return this.analytics.suggestMerges();
  }

  async detectDrift(): Promise<any> {
    return this.analytics.detectDrift();
  }

  // Export methods
  *getThoughtBatches(batchSize: number): Generator<ThoughtData[]> {
    yield* this.storage.getThoughtBatches(batchSize);
  }

  *getBranchBatches(batchSize: number): Generator<BranchNode[]> {
    yield* this.storage.getBranchBatches(batchSize);
  }
}

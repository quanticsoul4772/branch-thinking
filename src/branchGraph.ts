import { createHash } from 'crypto';
import { 
  ThoughtData, 
  BranchNode, 
  ThoughtEvent, 
  BranchingThoughtInput,
  CrossRefType
} from './types.js';
import { ContradictionBloomFilter } from './bloomFilter.js';
import { SimilarityMatrix } from './sparseMatrix.js';
import { CircularReasoningDetector, CircularPattern } from './circularReasoningDetector.js';
import { getConfig } from './config.js';
import { semanticProfileManager } from './semanticProfile.js';
import { BranchGraphStorage } from './utils/BranchGraphStorage.js';
import { BranchGraphSearch } from './utils/BranchGraphSearch.js';
import { BranchGraphAnalytics } from './utils/BranchGraphAnalytics.js';
import { BranchGraphValidator, ValidatedThoughtInput } from './BranchGraphValidator.js';
// Error types available if needed
// import { ValidationError, BranchNotFoundError, ThoughtNotFoundError } from './utils/customErrors.js';

export interface AddThoughtParams {
  content: string;
  branchId?: string | undefined;
  type: string;
  confidence?: number | undefined;
  keyPoints?: string[] | undefined;
  parentBranchId?: string | undefined;
  crossRefs?: Array<{
    toBranch: string;
    type: CrossRefType;
    reason: string;
    strength: number;
  }> | undefined;
}

export interface AddThoughtResult {
  thoughtId: string;
  overlapWarning?: {
    suggestedBranch: string;
    currentSimilarity: number;
    suggestedSimilarity: number;
  };
}

// Interfaces for return types to fix ESLint any violations
export interface LegacyBranch {
  id: string;
  state: string;
  priority: number;
  confidence: number;
  thoughts: ThoughtData[];
  insights: Array<{
    id: string;
    type: string;
    content: string;
    timestamp: string;
  }>;
  crossRefs: Array<{
    toBranch: string;
    type: CrossRefType;
    reason: string;
    strength: number;
    thoughtId?: string;
  }>;
  parentBranchId: string | null;
}

export interface ProfileComparison {
  branchComparisons: Array<{
    branch1: string;
    branch2: string;
    similarity: number;
    sharedConcepts: string[];
  }>;
  mostSimilarPairs: Array<{ branches: string[]; similarity: number }>;
  mostDistinctBranches: string[];
}

export interface MergeSuggestions {
  suggestions: Array<{
    branches: string[];
    reason: string;
    similarity: number;
    potentialBenefit: string;
  }>;
}

export interface DriftDetection {
  driftingBranches: Array<{
    branchId: string;
    driftScore: number;
    reason: string;
    recommendation: string;
  }>;
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
  
  // Validation constants
  private static readonly MIN_CONTENT_LENGTH = 1;
  private static readonly MAX_CONTENT_LENGTH = 10000;
  private static readonly MIN_CONFIDENCE = 0.0;
  private static readonly MAX_CONFIDENCE = 1.0;
  private static readonly MAX_STRENGTH = 1.0;
  private static readonly MIN_STRENGTH = 0.0;
  private static readonly MAX_BRANCH_ID_LENGTH = 100;
  
  constructor() {
    // Initialize components
    this.storage = new BranchGraphStorage();
    this.search = new BranchGraphSearch(this.storage);
    this.analytics = new BranchGraphAnalytics(this.storage);
    
    // Initialize Phase 4 components
    this.contradictionFilter = new ContradictionBloomFilter();
    this.similarityMatrix = new SimilarityMatrix(getConfig().matrix.similarityThreshold);
    this.circularDetector = new CircularReasoningDetector();
    
    // Initialize main branch
    this.createBranchWithId('main');
  }

  /**
   * Add a thought to the graph
   */
  async addThought(input: BranchingThoughtInput): Promise<AddThoughtResult> {
    // Validate input using centralized validator
    const validatedInput = BranchGraphValidator.validateBranchingThoughtInput(input);
    const params = this.prepareAddThoughtParams(validatedInput);
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
    
    return { 
      thoughtId, 
      ...(overlapWarning && { overlapWarning })
    };
  }

  private prepareAddThoughtParams(input: ValidatedThoughtInput): AddThoughtParams {
    return {
      content: input.content,
      branchId: input.branchId,
      type: input.type,
      confidence: input.confidence,
      keyPoints: input.keyPoints,
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
      confidence: params.confidence ?? getConfig().branch.defaultConfidence,
      keyPoints: params.keyPoints ?? []
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
    
    // Validate branch ID format
    BranchGraphValidator.validateBranchId(branchId);
    
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
    if (!branch) {
      return;
    }
    
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
    if (!currentBranch?.semanticProfile) {
      return undefined;
    }
    
    const allBranches = this.storage.getAllBranches();
    const { branch: mostSimilarBranch, similarity: maxSimilarity } = 
      await semanticProfileManager.findMostSimilarBranch(content, allBranches, currentBranchId);
    
    if (!mostSimilarBranch) {
      return undefined;
    }
    
    const currentSimilarity = await semanticProfileManager.calculateThoughtToBranchSimilarity(
      content, 
      currentBranch
    );
    
    // Only warn if significantly more similar to another branch
    if (maxSimilarity <= currentSimilarity + 0.15) {
      return undefined;
    }
    
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
    if (!crossRefs) {
      return;
    }
    
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
    // Validate parent branch exists if provided
    if (parentBranchId !== undefined) {
      BranchGraphValidator.validateBranchId(parentBranchId);
      BranchGraphValidator.validateBranchExists(parentBranchId, (id) => this.storage.getBranch(id));
    }
    
    const branchId = `branch-${++this.branchCounter}`;
    this.createBranchWithId(branchId, parentBranchId);
    return branchId;
  }
  
  /**
   * Create a branch with a specific ID
   */
  createBranchWithId(branchId: string, parentBranchId?: string): void {
    // Validate branch ID format
    BranchGraphValidator.validateBranchId(branchId);
    
    // Check if branch already exists (preserve from main)
    if (this.storage.hasBranch(branchId)) {
      return; // Silently skip if branch already exists
    }
    
    // Validate parent branch exists if specified
    if (parentBranchId) {
      BranchGraphValidator.validateBranchId(parentBranchId);
      BranchGraphValidator.validateBranchExists(parentBranchId, (id) => this.storage.getBranch(id));
    }
    
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
    // Validate thought ID format
    BranchGraphValidator.validateThoughtId(thoughtId);
    
    return this.storage.getThought(thoughtId);
  }

  getBranch(branchId: string): BranchNode | undefined {
    // Validate branch ID format
    BranchGraphValidator.validateBranchId(branchId);
    
    return this.storage.getBranch(branchId);
  }

  getAllBranches(): BranchNode[] {
    return this.storage.getAllBranches();
  }

  getRecentThoughts(branchId: string, count: number): ThoughtData[] {
    // Validate parameters using centralized validator
    BranchGraphValidator.validateBranchId(branchId);
    BranchGraphValidator.validateCount(count);
    BranchGraphValidator.validateBranchExists(branchId, (id) => this.storage.getBranch(id));
    
    return this.storage.getRecentThoughts(branchId, count);
  }

  // Search methods
  breadthFirstSearch(startBranchId: string, maxDepth: number): Set<string> {
    // Validate search parameters using centralized validator
    BranchGraphValidator.validateBranchId(startBranchId);
    BranchGraphValidator.validateMaxDepth(maxDepth);
    BranchGraphValidator.validateBranchExists(startBranchId, (id) => this.storage.getBranch(id));
    
    return this.search.breadthFirstSearch(startBranchId, maxDepth);
  }

  searchThoughts(pattern: RegExp): { thoughtId: string; branchId: string }[] {
    // Validate search pattern using centralized validator
    BranchGraphValidator.validateSearchPattern(pattern);
    
    return this.search.searchThoughts(pattern);
  }

  // Analytics methods
  getStatistics(): Record<string, unknown> {
    return {
      ...this.analytics.getBasicStats(),
      contradictionFilterStats: this.contradictionFilter.getStats(),
      similarityMatrixStats: this.similarityMatrix.getStats(),
      circularReasoningStats: this.circularDetector.getStats()
    };
  }

  // Phase 4 methods
  calculateSimilarity(thoughtId1: string, thoughtId2: string): number {
    // Validate thought IDs using centralized validator
    BranchGraphValidator.validateThoughtId(thoughtId1);
    BranchGraphValidator.validateThoughtId(thoughtId2);
    
    const thought1 = this.storage.getThought(thoughtId1);
    const thought2 = this.storage.getThought(thoughtId2);
    
    if (!thought1 || !thought2) {
      return 0;
    }
    
    // Check cache first
    const cached = this.similarityMatrix.getSimilarity(thoughtId1, thoughtId2);
    if (cached > 0) {
      return cached;
    }
    
    // Calculate new similarity
    const similarity = this.analytics.computeCosineSimilarity(thought1.content, thought2.content);
    
    // Store in sparse matrix
    this.similarityMatrix.setSimilarity(thoughtId1, thoughtId2, similarity);
    
    return similarity;
  }

  getMostSimilarThoughts(thoughtId: string, topK = 5): { thoughtId: string; similarity: number }[] {
    // Validate parameters using centralized validator
    BranchGraphValidator.validateThoughtId(thoughtId);
    BranchGraphValidator.validateCount(topK);
    
    return this.similarityMatrix.getMostSimilar(thoughtId, topK);
  }

  detectCircularReasoning(): CircularPattern[] {
    return this.circularDetector.detectAllPatterns();
  }

  getThoughtClusters(minSimilarity: number = getConfig().matrix.clusteringMinSimilarity): string[][] {
    // Validate similarity threshold using centralized validator
    BranchGraphValidator.validateSimilarityThreshold(minSimilarity);
    
    return this.similarityMatrix.getClusters(minSimilarity);
  }

  // Legacy compatibility
  toLegacyBranch(branchId: string): LegacyBranch | null {
    // Validate branch ID using centralized validator
    BranchGraphValidator.validateBranchId(branchId);
    BranchGraphValidator.validateBranchExists(branchId, (id) => this.storage.getBranch(id));
    
    return this.storage.toLegacyBranch(branchId);
  }

  // Semantic profile methods
  compareProfiles(): ProfileComparison {
    return this.analytics.compareProfiles();
  }

  suggestMerges(): Promise<MergeSuggestions> {
    return Promise.resolve(this.analytics.suggestMerges());
  }

  detectDrift(): Promise<DriftDetection> {
    return Promise.resolve(this.analytics.detectDrift());
  }

  // Export methods
  *getThoughtBatches(batchSize: number): Generator<ThoughtData[]> {
    // Validate batch size using centralized validator
    BranchGraphValidator.validateCount(batchSize);
    
    yield* this.storage.getThoughtBatches(batchSize);
  }

  *getBranchBatches(batchSize: number): Generator<BranchNode[]> {
    // Validate batch size using centralized validator
    BranchGraphValidator.validateCount(batchSize);
    
    yield* this.storage.getBranchBatches(batchSize);
  }
}

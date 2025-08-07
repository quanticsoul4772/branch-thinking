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
import { 
  ValidationError, 
  BranchNotFoundError, 
  ThoughtNotFoundError,
  BranchThinkingError,
  ErrorHandler
} from './utils/customErrors.js';

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
   * Validate content parameter
   */
  private validateContent(content: string): void {
    if (!content || typeof content !== 'string') {
      throw new ValidationError('Content must be a non-empty string', 'content', content);
    }
    
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      throw new ValidationError('Content cannot be empty or only whitespace', 'content', content);
    }
    
    if (trimmedContent.length > 10000) { // reasonable limit
      throw new ValidationError('Content exceeds maximum length of 10000 characters', 'content', trimmedContent.length);
    }
  }

  /**
   * Validate branch ID parameter
   */
  private validateBranchId(branchId: string): void {
    if (!branchId || typeof branchId !== 'string') {
      throw new ValidationError('Branch ID must be a non-empty string', 'branchId', branchId);
    }
    
    const trimmedId = branchId.trim();
    if (trimmedId.length === 0) {
      throw new ValidationError('Branch ID cannot be empty or only whitespace', 'branchId', branchId);
    }
    
    // Check for invalid characters
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedId)) {
      throw new ValidationError('Branch ID can only contain letters, numbers, underscores, and hyphens', 'branchId', branchId);
    }
  }

  /**
   * Validate that branch exists
   */
  private validateBranchExists(branchId: string): void {
    if (!this.storage.hasBranch(branchId)) {
      throw new BranchNotFoundError(branchId);
    }
  }

  /**
   * Validate thought ID parameter
   */
  private validateThoughtId(thoughtId: string): void {
    if (!thoughtId || typeof thoughtId !== 'string') {
      throw new ValidationError('Thought ID must be a non-empty string', 'thoughtId', thoughtId);
    }
    
    if (thoughtId.trim().length === 0) {
      throw new ValidationError('Thought ID cannot be empty or only whitespace', 'thoughtId', thoughtId);
    }
  }

  /**
   * Validate that thought exists
   */
  private validateThoughtExists(thoughtId: string): void {
    if (!this.storage.hasThought(thoughtId)) {
      throw new ThoughtNotFoundError(thoughtId);
    }
  }

  /**
   * Validate cross-reference parameters
   */
  private validateCrossReference(crossRef: {
    toBranch: string;
    type: CrossRefType;
    reason: string;
    strength: number;
  }): void {
    this.validateBranchId(crossRef.toBranch);
    
    if (!crossRef.reason || typeof crossRef.reason !== 'string' || crossRef.reason.trim().length === 0) {
      throw new ValidationError('Cross-reference reason must be a non-empty string', 'crossRef.reason', crossRef.reason);
    }
    
    if (typeof crossRef.strength !== 'number' || crossRef.strength < 0 || crossRef.strength > 1) {
      throw new ValidationError('Cross-reference strength must be a number between 0 and 1', 'crossRef.strength', crossRef.strength);
    }
  }

  /**
   * Add a thought to the graph
   */
  async addThought(input: BranchingThoughtInput): Promise<AddThoughtResult> {
    try {
      // Validate input
      this.validateAddThoughtInput(input);
      
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
    } catch (error) {
      throw ErrorHandler.handle(error);
    }
  }

  /**
   * Validate addThought input parameters
   */
  private validateAddThoughtInput(input: BranchingThoughtInput): void {
    if (!input || typeof input !== 'object') {
      throw new ValidationError('Input must be an object', 'input', input);
    }
    
    this.validateContent(input.content);
    
    if (input.branchId !== undefined) {
      this.validateBranchId(input.branchId);
    }
    
    if (input.parentBranchId !== undefined) {
      this.validateBranchId(input.parentBranchId);
      this.validateBranchExists(input.parentBranchId);
    }
    
    if (input.confidence !== undefined) {
      if (typeof input.confidence !== 'number' || input.confidence < 0 || input.confidence > 1) {
        throw new ValidationError('Confidence must be a number between 0 and 1', 'confidence', input.confidence);
      }
    }
    
    if (input.crossRefs !== undefined) {
      if (!Array.isArray(input.crossRefs)) {
        throw new ValidationError('Cross-references must be an array', 'crossRefs', input.crossRefs);
      }
      
      input.crossRefs.forEach((crossRef, index) => {
        try {
          this.validateCrossReference(crossRef);
        } catch (error) {
          if (error instanceof ValidationError) {
            throw new ValidationError(`Cross-reference at index ${index}: ${error.message}`, `crossRefs[${index}]`, crossRef);
          }
          throw error;
        }
      });
    }
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
    try {
      if (parentBranchId !== undefined) {
        this.validateBranchId(parentBranchId);
        this.validateBranchExists(parentBranchId);
      }
      
      const branchId = `branch-${++this.branchCounter}`;
      this.createBranchWithId(branchId, parentBranchId);
      return branchId;
    } catch (error) {
      throw ErrorHandler.handle(error);
    }
  }
  
  /**
   * Create a branch with a specific ID
   */
  createBranchWithId(branchId: string, parentBranchId?: string): void {
    try {
      this.validateBranchId(branchId);
      
      if (this.storage.hasBranch(branchId)) {
        throw new ValidationError(`Branch with ID '${branchId}' already exists`, 'branchId', branchId);
      }
      
      if (parentBranchId !== undefined) {
        this.validateBranchId(parentBranchId);
        this.validateBranchExists(parentBranchId);
      }
      
      this.storage.createBranch(branchId, parentBranchId);
      
      this.storage.recordEvent({
        type: 'branch_created',
        branchId,
        timestamp: Date.now(),
        index: this.eventCounter++,
        data: { parentBranchId }
      });
    } catch (error) {
      throw ErrorHandler.handle(error);
    }
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
    try {
      this.validateThoughtId(thoughtId);
      return this.storage.getThought(thoughtId);
    } catch (error) {
      throw ErrorHandler.handle(error);
    }
  }

  getBranch(branchId: string): BranchNode | undefined {
    try {
      this.validateBranchId(branchId);
      return this.storage.getBranch(branchId);
    } catch (error) {
      throw ErrorHandler.handle(error);
    }
  }

  getAllBranches(): BranchNode[] {
    try {
      return this.storage.getAllBranches();
    } catch (error) {
      throw ErrorHandler.handle(error);
    }
  }

  getRecentThoughts(branchId: string, count: number): ThoughtData[] {
    try {
      this.validateBranchId(branchId);
      this.validateBranchExists(branchId);
      
      if (typeof count !== 'number' || count < 0) {
        throw new ValidationError('Count must be a non-negative number', 'count', count);
      }
      
      return this.storage.getRecentThoughts(branchId, count);
    } catch (error) {
      throw ErrorHandler.handle(error);
    }
  }

  // Search methods
  breadthFirstSearch(startBranchId: string, maxDepth: number): Set<string> {
    try {
      this.validateBranchId(startBranchId);
      this.validateBranchExists(startBranchId);
      
      if (typeof maxDepth !== 'number' || maxDepth < 0) {
        throw new ValidationError('Max depth must be a non-negative number', 'maxDepth', maxDepth);
      }
      
      return this.search.breadthFirstSearch(startBranchId, maxDepth);
    } catch (error) {
      throw ErrorHandler.handle(error);
    }
  }

  searchThoughts(pattern: RegExp): { thoughtId: string; branchId: string }[] {
    try {
      if (!(pattern instanceof RegExp)) {
        throw new ValidationError('Pattern must be a valid RegExp object', 'pattern', pattern);
      }
      
      return this.search.searchThoughts(pattern);
    } catch (error) {
      throw ErrorHandler.handle(error);
    }
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
    try {
      this.validateThoughtId(thoughtId1);
      this.validateThoughtId(thoughtId2);
      this.validateThoughtExists(thoughtId1);
      this.validateThoughtExists(thoughtId2);
      
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
    } catch (error) {
      throw ErrorHandler.handle(error);
    }
  }

  getMostSimilarThoughts(thoughtId: string, topK: number = 5): { thoughtId: string; similarity: number }[] {
    try {
      this.validateThoughtId(thoughtId);
      this.validateThoughtExists(thoughtId);
      
      if (typeof topK !== 'number' || topK < 1) {
        throw new ValidationError('TopK must be a positive number', 'topK', topK);
      }
      
      return this.similarityMatrix.getMostSimilar(thoughtId, topK);
    } catch (error) {
      throw ErrorHandler.handle(error);
    }
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

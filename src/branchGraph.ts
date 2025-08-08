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
import { ValidationError, BranchNotFoundError, ThoughtNotFoundError } from './utils/customErrors.js';

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
    // Input validation
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
      this.validateBranchId(parentBranchId, 'parentBranchId');
    }
    
    const branchId = `branch-${++this.branchCounter}`;
    this.createBranchWithId(branchId, parentBranchId);
    return branchId;
  }
  
  /**
   * Create a branch with a specific ID
   */
  createBranchWithId(branchId: string, parentBranchId?: string): void {
    // Input validation
    this.validateBranchIdFormat(branchId, 'branchId');
    
    if (parentBranchId !== undefined) {
      this.validateBranchId(parentBranchId, 'parentBranchId');
    }
    
    // Check if branch already exists
    if (this.storage.hasBranch(branchId)) {
      return; // Silently skip if branch already exists
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
    return this.storage.getThought(thoughtId);
  }

  getBranch(branchId: string): BranchNode | undefined {
    return this.storage.getBranch(branchId);
  }

  getAllBranches(): BranchNode[] {
    return this.storage.getAllBranches();
  }

  getRecentThoughts(branchId: string, count: number): ThoughtData[] {
    // Input validation
    this.validateBranchId(branchId, 'branchId');
    this.validatePositiveInteger(count, 'count');
    
    return this.storage.getRecentThoughts(branchId, count);
  }

  // Search methods
  breadthFirstSearch(startBranchId: string, maxDepth: number): Set<string> {
    // Input validation
    this.validateBranchId(startBranchId, 'startBranchId');
    this.validatePositiveInteger(maxDepth, 'maxDepth');
    
    return this.search.breadthFirstSearch(startBranchId, maxDepth);
  }

  searchThoughts(pattern: RegExp): { thoughtId: string; branchId: string }[] {
    // Input validation
    if (!(pattern instanceof RegExp)) {
      throw new Error('Parameter \'pattern\' must be a valid RegExp object');
    }
    
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
    // Input validation
    this.validateThoughtId(thoughtId1, 'thoughtId1');
    this.validateThoughtId(thoughtId2, 'thoughtId2');
  
    const thought1 = this.storage.getThought(thoughtId1)!;
    const thought2 = this.storage.getThought(thoughtId2)!;
    
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

  getMostSimilarThoughts(thoughtId: string, topK: number = 5): { thoughtId: string; similarity: number }[] {
    // Input validation
    this.validateThoughtId(thoughtId, 'thoughtId');
    this.validatePositiveInteger(topK, 'topK');
    
    return this.similarityMatrix.getMostSimilar(thoughtId, topK);
  }

  detectCircularReasoning(): any {
    return this.circularDetector.detectAllPatterns();
  }

  getThoughtClusters(minSimilarity: number = getConfig().matrix.clusteringMinSimilarity): string[][] {
    // Input validation
    this.validateRange(minSimilarity, 0, 1, 'minSimilarity');
    
    return this.similarityMatrix.getClusters(minSimilarity);
  }

  // Legacy compatibility
  toLegacyBranch(branchId: string): any {
    // Input validation
    this.validateBranchId(branchId, 'branchId');
    
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
    // Input validation
    this.validatePositiveInteger(batchSize, 'batchSize');
    
    yield* this.storage.getThoughtBatches(batchSize);
  }

  *getBranchBatches(batchSize: number): Generator<BranchNode[]> {
    // Input validation
    this.validatePositiveInteger(batchSize, 'batchSize');
    
    yield* this.storage.getBranchBatches(batchSize);
  }
  
  // Private validation methods
  
  /**
   * Validate input for addThought method
   */
  private validateAddThoughtInput(input: BranchingThoughtInput): void {
    if (!input) {
      throw new ValidationError('Input parameter is required', 'input');
    }
    
    // Validate content
    this.validateContent(input.content);
    
    // Validate type
    this.validateNonEmptyString(input.type, 'type');
    
    // Validate optional confidence
    if (input.confidence !== undefined) {
      this.validateConfidence(input.confidence);
    }
    
    // Validate optional keyPoints
    if (input.keyPoints !== undefined) {
      this.validateKeyPoints(input.keyPoints);
    }
    
    // Validate optional branchId format
    if (input.branchId !== undefined) {
      this.validateBranchIdFormat(input.branchId, 'branchId');
    }
    
    // Validate optional parentBranchId
    if (input.parentBranchId !== undefined) {
      this.validateBranchId(input.parentBranchId, 'parentBranchId');
    }
    
    // Validate optional crossRefs
    if (input.crossRefs !== undefined) {
      this.validateCrossRefs(input.crossRefs);
    }
  }
  
  /**
   * Validate thought content
   */
  private validateContent(content: any): void {
    if (content === null || content === undefined) {
      throw new ValidationError('Content is required', 'content');
    }
    
    if (typeof content !== 'string') {
      throw new ValidationError('Content must be a string', 'content', content);
    }
    
    if (content.trim().length < BranchGraph.MIN_CONTENT_LENGTH) {
      throw new ValidationError(`Content must be at least ${BranchGraph.MIN_CONTENT_LENGTH} character(s) long`, 'content', content);
    }
    
    if (content.length > BranchGraph.MAX_CONTENT_LENGTH) {
      throw new ValidationError(`Content must not exceed ${BranchGraph.MAX_CONTENT_LENGTH} characters`, 'content', content);
    }
  }
  
  /**
   * Validate confidence value
   */
  private validateConfidence(confidence: any): void {
    this.validateRange(confidence, BranchGraph.MIN_CONFIDENCE, BranchGraph.MAX_CONFIDENCE, 'confidence');
  }
  
  /**
   * Validate numeric range
   */
  private validateRange(value: any, min: number, max: number, paramName: string): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`Parameter '${paramName}' must be a valid number`);
    }
    
    if (value < min || value > max) {
      throw new Error(`Parameter '${paramName}' must be between ${min} and ${max}`);
    }
  }
  
  /**
   * Validate key points array
   */
  private validateKeyPoints(keyPoints: any): void {
    if (!Array.isArray(keyPoints)) {
      throw new Error('KeyPoints must be an array');
    }
    
    // Allow empty arrays, but validate non-empty ones
    if (keyPoints.length > 0) {
      for (let i = 0; i < keyPoints.length; i++) {
        if (typeof keyPoints[i] !== 'string') {
          throw new Error(`KeyPoint at index ${i} must be a string`);
        }
        
        if (keyPoints[i].trim().length === 0) {
          throw new Error(`KeyPoint at index ${i} cannot be empty`);
        }
      }
    }
  }
  
  /**
   * Validate cross references
   */
  private validateCrossRefs(crossRefs: any): void {
    if (!Array.isArray(crossRefs)) {
      throw new Error('CrossRefs must be an array');
    }
    
    // Allow empty crossRefs arrays - they represent no cross-references
    if (crossRefs.length === 0) {
      return; // Early return for empty arrays
    }
    
    for (let i = 0; i < crossRefs.length; i++) {
      const ref = crossRefs[i];
      
      if (!ref || typeof ref !== 'object') {
        throw new Error(`CrossRef at index ${i} must be an object`);
      }
      
      // Validate toBranch
      this.validateBranchIdFormat(ref.toBranch, `crossRefs[${i}].toBranch`);
      
      // Validate type
      this.validateCrossRefType(ref.type, `crossRefs[${i}].type`);
      
      // Validate reason
      this.validateNonEmptyString(ref.reason, `crossRefs[${i}].reason`);
      
      // Validate strength
      this.validateRange(ref.strength, BranchGraph.MIN_STRENGTH, BranchGraph.MAX_STRENGTH, `crossRefs[${i}].strength`);
    }
  }
  
  /**
   * Validate cross reference type
   */
  private validateCrossRefType(type: any, paramName: string): void {
    const validTypes: CrossRefType[] = ['complementary', 'contradictory', 'builds_upon', 'alternative', 'supports'];
    
    if (typeof type !== 'string' || !validTypes.includes(type as CrossRefType)) {
      throw new Error(`Parameter '${paramName}' must be one of: ${validTypes.join(', ')}`);
    }
  }
  
  /**
   * Validate branch ID format (for new branches)
   */
  private validateBranchIdFormat(branchId: any, paramName: string): void {
    if (branchId === null || branchId === undefined) {
      throw new Error(`Parameter '${paramName}' is required`);
    }
    
    if (typeof branchId !== 'string') {
      throw new Error(`Parameter '${paramName}' must be a string`);
    }
    
    if (branchId.trim().length === 0) {
      throw new Error(`Parameter '${paramName}' cannot be empty`);
    }
    
    // Basic format validation (no whitespace, reasonable length)
    if (/\s/.test(branchId)) {
      throw new Error(`Parameter '${paramName}' cannot contain whitespace`);
    }
    if (branchId.length > BranchGraph.MAX_BRANCH_ID_LENGTH) {
      throw new Error(`Parameter '${paramName}' must not exceed ${BranchGraph.MAX_BRANCH_ID_LENGTH} characters`);
    }
  }
  
  /**
   * Validate branch ID exists
   */
  private validateBranchId(branchId: any, paramName: string): void {
    this.validateBranchIdFormat(branchId, paramName);
    
    if (!this.storage.hasBranch(branchId)) {
      throw new Error(`Branch '${branchId}' does not exist`);
    }
  }
  
  /**
   * Validate thought ID exists
   */
  private validateThoughtId(thoughtId: any, paramName: string): void {
    if (thoughtId === null || thoughtId === undefined) {
      throw new Error(`Parameter '${paramName}' is required`);
    }
    
    if (typeof thoughtId !== 'string') {
      throw new Error(`Parameter '${paramName}' must be a string`);
    }
    
    if (thoughtId.trim().length === 0) {
      throw new Error(`Parameter '${paramName}' cannot be empty`);
    }
    
    if (!this.storage.getThought(thoughtId)) {
      throw new Error(`Thought '${thoughtId}' does not exist`);
    }
  }
  
  /**
   * Validate non-empty string
   */
  private validateNonEmptyString(value: any, paramName: string): void {
    if (value === null || value === undefined) {
      throw new Error(`Parameter '${paramName}' is required`);
    }
    
    if (typeof value !== 'string') {
      throw new Error(`Parameter '${paramName}' must be a string`);
    }
    
    if (value.trim().length === 0) {
      throw new Error(`Parameter '${paramName}' cannot be empty`);
    }
  }
  
  /**
   * Validate positive integer
   */
  private validatePositiveInteger(value: any, paramName: string): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`Parameter '${paramName}' must be a valid number`);
    }
    
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Parameter '${paramName}' must be a positive integer`);
    }
  }
}

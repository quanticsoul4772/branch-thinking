import { 
  ThoughtData, 
  BranchNode, 
  ThoughtEvent,
  ProcessedText
} from '../types.js';
import {
  BranchThinkingError,
  ValidationError,
  ErrorHandler
} from './customErrors.js';

/**
 * Storage management for BranchGraph
 * Handles all data storage operations
 */
export class BranchGraphStorage {
  private thoughts = new Map<string, ThoughtData>();
  private branches = new Map<string, BranchNode>();
  private events: ThoughtEvent[] = [];
  
  /**
   * Check if thought exists
   */
  hasThought(thoughtId: string): boolean {
    return this.thoughts.has(thoughtId);
  }
  
  /**
   * Get thought by ID
   */
  getThought(thoughtId: string): ThoughtData | undefined {
    return this.thoughts.get(thoughtId);
  }
  
  /**
   * Create thought if new
   */
  async createThoughtIfNew(data: {
    thoughtId: string;
    content: string;
    branchId: string;
    type: string;
    confidence: number;
    keyPoints: string[];
  }): Promise<void> {
    try {
      // Validate input data
      if (!data || typeof data !== 'object') {
        throw new ValidationError('Data must be an object', 'data', data);
      }
      
      if (!data.thoughtId || typeof data.thoughtId !== 'string') {
        throw new ValidationError('Thought ID must be a non-empty string', 'thoughtId', data.thoughtId);
      }
      
      if (!data.content || typeof data.content !== 'string') {
        throw new ValidationError('Content must be a non-empty string', 'content', data.content);
      }
      
      if (!data.branchId || typeof data.branchId !== 'string') {
        throw new ValidationError('Branch ID must be a non-empty string', 'branchId', data.branchId);
      }
      
      if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) {
        throw new ValidationError('Confidence must be a number between 0 and 1', 'confidence', data.confidence);
      }
      
      if (!Array.isArray(data.keyPoints)) {
        throw new ValidationError('Key points must be an array', 'keyPoints', data.keyPoints);
      }
      
      if (this.hasThought(data.thoughtId)) return;
      
      const thought: ThoughtData = {
        id: data.thoughtId,
        content: data.content,
        branchId: data.branchId,
        timestamp: new Date(),
        metadata: {
          type: data.type,
          confidence: data.confidence,
          keyPoints: data.keyPoints
        }
      };
      
      this.thoughts.set(data.thoughtId, thought);
    } catch (error) {
      throw ErrorHandler.handle(error);
    }
  }
  
  /**
   * Process text for analysis
   */
  private processText(content: string): ProcessedText {
    const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const uniqueWords = new Set(words);
    
    return {
      lower: content.toLowerCase(),
      terms: uniqueWords,
      patterns: new Map<string, boolean>()
    };
  }
  
  /**
   * Extract entities from text
   */
  private extractEntities(content: string): string[] {
    // Simple entity extraction - can be enhanced
    const capitalizedWords = content.match(/[A-Z][a-z]+/g) || [];
    return [...new Set(capitalizedWords)];
  }
  
  /**
   * Check if branch exists
   */
  hasBranch(branchId: string): boolean {
    return this.branches.has(branchId);
  }
  
  /**
   * Get branch by ID
   */
  getBranch(branchId: string): BranchNode | undefined {
    return this.branches.get(branchId);
  }
  
  /**
   * Create new branch
   */
  createBranch(branchId: string, parentBranchId?: string): void {
    try {
      if (!branchId || typeof branchId !== 'string') {
        throw new ValidationError('Branch ID must be a non-empty string', 'branchId', branchId);
      }
      
      if (this.hasBranch(branchId)) {
        throw new ValidationError(`Branch with ID '${branchId}' already exists`, 'branchId', branchId);
      }
      
      if (parentBranchId !== undefined) {
        if (typeof parentBranchId !== 'string' || parentBranchId.length === 0) {
          throw new ValidationError('Parent branch ID must be a non-empty string', 'parentBranchId', parentBranchId);
        }
        
        if (!this.hasBranch(parentBranchId)) {
          throw new ValidationError(`Parent branch '${parentBranchId}' does not exist`, 'parentBranchId', parentBranchId);
        }
      }
      
      const branch: BranchNode = {
        id: branchId,
        state: 'active',
        priority: 0.5,
        confidence: 0.5,
        thoughtIds: [],
        thoughts: [],
        parentId: parentBranchId,
        childIds: new Set<string>(),
        lastEvaluationIndex: 0
      };
      
      this.branches.set(branchId, branch);
      
      // Update parent's children set if parent exists
      if (parentBranchId) {
        const parent = this.branches.get(parentBranchId);
        if (parent) {
          parent.childIds.add(branchId);
        }
      }
    } catch (error) {
      throw ErrorHandler.handle(error);
    }
  }
  
  /**
   * Add thought to branch
   */
  addThoughtToBranch(thoughtId: string, branchId: string): void {
    try {
      if (!thoughtId || typeof thoughtId !== 'string') {
        throw new ValidationError('Thought ID must be a non-empty string', 'thoughtId', thoughtId);
      }
      
      if (!branchId || typeof branchId !== 'string') {
        throw new ValidationError('Branch ID must be a non-empty string', 'branchId', branchId);
      }
      
      const branch = this.getBranch(branchId);
      const thought = this.getThought(thoughtId);
      
      if (!branch) {
        throw new ValidationError(`Branch '${branchId}' does not exist`, 'branchId', branchId);
      }
      
      if (!thought) {
        throw new ValidationError(`Thought '${thoughtId}' does not exist`, 'thoughtId', thoughtId);
      }
      
      // Check if thought is already in branch to prevent duplicates
      if (branch.thoughtIds.includes(thoughtId)) {
        return; // Thought already exists in branch, no error
      }
      
      branch.thoughtIds.push(thoughtId);
      branch.thoughts.push(thought);
    } catch (error) {
      throw ErrorHandler.handle(error);
    }
  }
  
  /**
   * Get all branches
   */
  getAllBranches(): BranchNode[] {
    return Array.from(this.branches.values());
  }
  
  /**
   * Get recent thoughts from branch
   */
  getRecentThoughts(branchId: string, count: number): ThoughtData[] {
    const branch = this.getBranch(branchId);
    if (!branch) return [];
    
    return branch.thoughts.slice(-count);
  }
  
  /**
   * Record event
   */
  recordEvent(event: ThoughtEvent): void {
    this.events.push(event);
  }
  
  /**
   * Get events since index
   */
  getEventsSince(index: number): ThoughtEvent[] {
    return this.events.slice(index);
  }
  
  /**
   * Convert to legacy format
   */
  toLegacyBranch(branchId: string): any {
    const branch = this.getBranch(branchId);
    if (!branch) return null;
    
    return {
      id: branch.id,
      state: branch.state,
      priority: branch.priority,
      confidence: branch.confidence,
      thoughts: branch.thoughts,
      insights: [],
      crossRefs: [],
      parentBranchId: branch.parentId
    };
  }
  
  /**
   * Get thought batches for export
   */
  *getThoughtBatches(batchSize: number): Generator<ThoughtData[]> {
    const thoughts = Array.from(this.thoughts.values());
    for (let i = 0; i < thoughts.length; i += batchSize) {
      yield thoughts.slice(i, i + batchSize);
    }
  }
  
  /**
   * Get branch batches for export
   */
  *getBranchBatches(batchSize: number): Generator<BranchNode[]> {
    const branches = Array.from(this.branches.values());
    for (let i = 0; i < branches.length; i += batchSize) {
      yield branches.slice(i, i + batchSize);
    }
  }
}

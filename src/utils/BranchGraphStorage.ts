import { 
  ThoughtData, 
  BranchNode, 
  ThoughtEvent,
  ProcessedText
} from '../types.js';

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
  }
  
  /**
   * Add thought to branch
   */
  addThoughtToBranch(thoughtId: string, branchId: string): void {
    const branch = this.getBranch(branchId);
    const thought = this.getThought(thoughtId);
    if (!branch || !thought) return;
    
    branch.thoughtIds.push(thoughtId);
    branch.thoughts.push(thought);
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

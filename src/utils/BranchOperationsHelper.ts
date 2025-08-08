import { BranchGraph } from '../branchGraph.js';
import { ThoughtBranch, ThoughtData } from '../types.js';

/**
 * Helper class for branch-related operations
 * Handles branch CRUD operations and conversions
 */
export class BranchOperationsHelper {
  /**
   * Get branch in legacy format
   */
  getBranch(graph: BranchGraph, branchId: string): ThoughtBranch | undefined {
    const legacyBranch = graph.toLegacyBranch(branchId);
    if (!legacyBranch) {
      return undefined;
    }
    return legacyBranch as any;
  }
  
  /**
   * Get all branches in legacy format
   */
  getAllBranches(graph: BranchGraph): ThoughtBranch[] {
    return graph.getAllBranches()
      .map(b => graph.toLegacyBranch(b.id))
      .filter((b): b is ThoughtBranch => b !== null);
  }
  
  /**
   * Get active branch
   */
  getActiveBranch(graph: BranchGraph, activeBranchId: string | null): ThoughtBranch | undefined {
    if (!activeBranchId) {
      return undefined;
    }
    return graph.toLegacyBranch(activeBranchId);
  }
  
  /**
   * Validate and set active branch
   */
  setActiveBranch(graph: BranchGraph, branchId: string): void {
    if (!graph.getBranch(branchId)) {
      throw new Error(`Branch ${branchId} not found`);
    }
  }
  
  /**
   * Get thoughts for a branch
   */
  getBranchThoughts(graph: BranchGraph, branch: any): ThoughtData[] {
    return branch.thoughts
      .map((id: string) => graph.getThought(id))
      .filter((t: ThoughtData | undefined): t is ThoughtData => t !== undefined);
  }
  
  /**
   * Get branch history
   */
  getBranchHistory(graph: BranchGraph, branchId: string): any {
    const branch = graph.getBranch(branchId);
    if (!branch) {
      throw new Error(`Branch ${branchId} not found`);
    }
    
    return {
      branch,
      thoughts: this.getBranchThoughts(graph, branch)
    };
  }
  
  /**
   * Resolve branch ID with auto-creation
   */
  resolveBranchId(
    graph: BranchGraph, 
    inputBranchId: string | undefined,
    activeBranchId: string | null
  ): string {
    if (inputBranchId) {
      return inputBranchId;
    }
    
    if (!activeBranchId) {
      return graph.createBranch();
    }
    
    return activeBranchId;
  }
}

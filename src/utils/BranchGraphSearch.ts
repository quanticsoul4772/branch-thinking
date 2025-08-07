import { ThoughtData } from '../types.js';
import { BranchGraphStorage } from './BranchGraphStorage.js';
import {
  ValidationError,
  ErrorHandler
} from './customErrors.js';

/**
 * Search functionality for BranchGraph
 * Handles all search operations
 */
export class BranchGraphSearch {
  constructor(private storage: BranchGraphStorage) {}
  
  /**
   * Breadth-first search from a starting branch
   */
  breadthFirstSearch(startBranchId: string, maxDepth: number): Set<string> {
    try {
      if (!startBranchId || typeof startBranchId !== 'string') {
        throw new ValidationError('Start branch ID must be a non-empty string', 'startBranchId', startBranchId);
      }
      
      if (typeof maxDepth !== 'number' || maxDepth < 0) {
        throw new ValidationError('Max depth must be a non-negative number', 'maxDepth', maxDepth);
      }
      
      if (!this.storage.hasBranch(startBranchId)) {
        throw new ValidationError(`Start branch '${startBranchId}' does not exist`, 'startBranchId', startBranchId);
      }
      
      const visited = new Set<string>();
      const queue: { branchId: string; depth: number }[] = [
        { branchId: startBranchId, depth: 0 }
      ];
      
      while (queue.length > 0) {
        const { branchId, depth } = queue.shift()!;
        
        if (depth > maxDepth || visited.has(branchId)) continue;
        
        visited.add(branchId);
        
        // Add child branches to queue
        const childBranches = this.getChildBranches(branchId);
        childBranches.forEach(childId => {
          if (!visited.has(childId)) {
            queue.push({ branchId: childId, depth: depth + 1 });
          }
        });
      }
      
      return visited;
    } catch (error) {
      throw ErrorHandler.handle(error);
    }
  }
  
  /**
   * Get child branches of a branch
   */
  private getChildBranches(parentId: string): string[] {
    return this.storage.getAllBranches()
      .filter(branch => branch.parentId === parentId)
      .map(branch => branch.id);
  }
  
  /**
   * Search thoughts by pattern
   */
  searchThoughts(pattern: RegExp): { thoughtId: string; branchId: string }[] {
    try {
      if (!(pattern instanceof RegExp)) {
        throw new ValidationError('Pattern must be a valid RegExp object', 'pattern', pattern);
      }
      
      const results: { thoughtId: string; branchId: string }[] = [];
      
      try {
        this.storage.getAllBranches().forEach(branch => {
          branch.thoughts.forEach(thought => {
            try {
              if (pattern.test(thought.content)) {
                results.push({ thoughtId: thought.id, branchId: branch.id });
              }
            } catch (regexError) {
              // Skip thoughts that cause regex errors but continue processing
              console.warn(`RegExp test failed for thought ${thought.id}: ${regexError}`);
            }
          });
        });
      } catch (storageError) {
        throw new ValidationError('Failed to access storage data', 'storage', storageError);
      }
      
      return results;
    } catch (error) {
      throw ErrorHandler.handle(error);
    }
  }
  
  /**
   * Find thoughts by type
   */
  findThoughtsByType(type: string): ThoughtData[] {
    const results: ThoughtData[] = [];
    
    this.storage.getAllBranches().forEach(branch => {
      branch.thoughts.forEach(thought => {
        if (thought.metadata.type === type) {
          results.push(thought);
        }
      });
    });
    
    return results;
  }
  
  /**
   * Find thoughts within confidence range
   */
  findThoughtsByConfidence(minConfidence: number, maxConfidence: number): ThoughtData[] {
    const results: ThoughtData[] = [];
    
    this.storage.getAllBranches().forEach(branch => {
      branch.thoughts.forEach(thought => {
        if (thought.metadata.confidence >= minConfidence && 
            thought.metadata.confidence <= maxConfidence) {
          results.push(thought);
        }
      });
    });
    
    return results;
  }
  
  /**
   * Find branches by state
   */
  findBranchesByState(state: string): string[] {
    return this.storage.getAllBranches()
      .filter(branch => branch.state === state)
      .map(branch => branch.id);
  }
  
  /**
   * Find orphaned branches (no parent and no children)
   */
  findOrphanedBranches(): string[] {
    const branches = this.storage.getAllBranches();
    const hasChildren = new Set<string>();
    
    // Mark branches that have children
    branches.forEach(branch => {
      if (branch.parentId) {
        hasChildren.add(branch.parentId);
      }
    });
    
    // Find branches with no parent and no children
    return branches
      .filter(branch => !branch.parentId && !hasChildren.has(branch.id))
      .map(branch => branch.id);
  }
}

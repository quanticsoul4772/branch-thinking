import { BranchGraph } from '../branchGraph.js';
import { semanticNavigator } from '../semanticNavigator.js';
import { FormattingHelper } from './FormattingHelper.js';

/**
 * Helper class for semantic operations
 * Handles semantic search, navigation, and path finding
 */
export class SemanticOperationsHelper {
  constructor(private formattingHelper: FormattingHelper) {}
  
  /**
   * Find thoughts similar to a query
   */
  async findSimilar(graph: BranchGraph, query: string, limit = 10): Promise<{
    results: Array<{
      thoughtId: string;
      content: string;
      branchId: string;
      similarity: number;
      type: string;
    }>;
    totalFound: number;
  }> {
    const results = await semanticNavigator.findSimilar(graph, query, limit);
    
    return {
      results: results.map(r => this.formattingHelper.formatSimilarThought(r)),
      totalFound: results.length
    };
  }
  
  /**
   * Jump to related thoughts from current position
   */
  async jumpToRelated(graph: BranchGraph, thoughtId: string, limit = 5): Promise<{
    related: Array<{
      thoughtId: string;
      content: string;
      branchId: string;
      similarity: number;
      relationship: string;
    }>;
    message: string;
  }> {
    try {
      const results = await semanticNavigator.jumpToRelated(graph, thoughtId, limit);
      
      return {
        related: results.map(r => this.formattingHelper.formatRelatedThought(r)),
        message: `Found ${results.length} related thoughts`
      };
    } catch (error) {
      return {
        related: [],
        message: error instanceof Error ? error.message : 'Error finding related thoughts'
      };
    }
  }
  
  /**
   * Find semantic path between two thoughts
   */
  async semanticPath(
    graph: BranchGraph, 
    fromThoughtId: string, 
    toThoughtId: string
  ): Promise<{
    path: Array<{
      thoughtId: string;
      content: string;
      branchId: string;
      similarity: number;
    }>;
    totalDistance: number;
    message: string;
  }> {
    try {
      const path = await semanticNavigator.findSemanticPath(
        graph,
        fromThoughtId,
        toThoughtId,
        5 // max steps
      );
      
      if (path.length === 0) {
        return {
          path: [],
          totalDistance: 0,
          message: 'No path found between thoughts'
        };
      }
      
      return this.formattingHelper.formatSemanticPath(path, toThoughtId);
    } catch (error) {
      return {
        path: [],
        totalDistance: 0,
        message: error instanceof Error ? error.message : 'Error finding semantic path'
      };
    }
  }
  
  /**
   * Compare semantic profiles of all branches
   */
  async compareProfiles(graph: BranchGraph): Promise<any> {
    return graph.compareProfiles();
  }
  
  /**
   * Suggest branches that could be merged
   */
  async suggestMerges(graph: BranchGraph): Promise<any> {
    return graph.suggestMerges();
  }
  
  /**
   * Detect semantic drift in branches
   */
  async detectDrift(graph: BranchGraph): Promise<any> {
    return graph.detectDrift();
  }
}

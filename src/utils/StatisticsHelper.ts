import { BranchGraph } from '../branchGraph.js';
import { BranchState } from '../types.js';
import { getConfig } from '../config.js';

/**
 * Helper class for statistics calculations
 * Extracted from BranchManagerAdapter to reduce complexity
 */
export class StatisticsHelper {
  /**
   * Get comprehensive reasoning statistics
   */
  getReasoningStatistics(graph: BranchGraph, activeBranchId: string | null): any {
    const stats = graph.getStatistics();
    const branches = graph.getAllBranches();
    
    const branchStates = this.calculateBranchStates(branches);
    const totalConfidence = this.calculateTotalConfidence(branches);
    const clusters = this.getThoughtClusters(graph);
    
    return {
      totalBranches: stats.branchCount,
      branchStates,
      totalThoughts: stats.thoughtCount,
      avgThoughtsPerBranch: stats.averageThoughtsPerBranch,
      avgConfidence: branches.length > 0 ? totalConfidence / branches.length : 0,
      totalEvents: stats.eventCount,
      cacheStats: stats.cacheStats,
      activeBranchId,
      // Phase 4 additions
      phase4Stats: {
        contradictionFilter: stats.contradictionFilterStats,
        similarityMatrix: stats.similarityMatrixStats,
        circularReasoning: stats.circularReasoningStats,
        thoughtClusters: clusters.length,
        largestCluster: this.getLargestClusterSize(clusters)
      }
    };
  }
  
  /**
   * Calculate branch states distribution
   */
  private calculateBranchStates(branches: any[]): Record<string, number> {
    const branchStates: Record<string, number> = {
      active: 0,
      suspended: 0,
      completed: 0,
      dead_end: 0,
      exploring: 0
    };
    
    branches.forEach(branch => {
      const state = branch.state as BranchState;
      if (state in branchStates) {
        branchStates[state]++;
      }
    });
    
    return branchStates;
  }
  
  /**
   * Calculate total confidence across all branches
   */
  private calculateTotalConfidence(branches: any[]): number {
    return branches.reduce((sum, branch) => {
      // Use priority as confidence if confidence field doesn't exist
      const confidence = branch.confidence || branch.priority || 0.5;
      return sum + confidence;
    }, 0);
  }
  
  /**
   * Get thought clusters from the graph
   */
  private getThoughtClusters(graph: BranchGraph): any[] {
    // Use the graph's built-in method if available
    if (typeof (graph as any).getThoughtClusters === 'function') {
      return (graph as any).getThoughtClusters(getConfig().matrix.clusteringMinSimilarity);
    }
    return [];
  }
  
  /**
   * Get the size of the largest cluster
   */
  private getLargestClusterSize(clusters: any[]): number {
    if (clusters.length === 0) return 0;
    return Math.max(...clusters.map((c: string[]) => c.length));
  }
  
  /**
   * Calculate branch quality metrics
   */
  calculateBranchQualityMetrics(branches: any[]): {
    highQualityCount: number;
    lowQualityCount: number;
    averageQuality: number;
  } {
    let highQualityCount = 0;
    let lowQualityCount = 0;
    let totalQuality = 0;
    
    const config = getConfig();
    
    branches.forEach(branch => {
      const quality = this.assessBranchQuality(branch);
      totalQuality += quality;
      
      if (quality > config.branch.completionThreshold) {
        highQualityCount++;
      } else if (quality < config.branch.deadEndThreshold) {
        lowQualityCount++;
      }
    });
    
    return {
      highQualityCount,
      lowQualityCount,
      averageQuality: branches.length > 0 ? totalQuality / branches.length : 0
    };
  }
  
  /**
   * Assess quality of a single branch
   */
  private assessBranchQuality(branch: any): number {
    // Simple quality assessment based on available metrics
    const thoughtCount = branch.thoughts ? branch.thoughts.length : 0;
    const priority = branch.priority || 0.5;
    const isActive = branch.state === 'active' || branch.state === 'exploring';
    
    // Weight factors
    const thoughtWeight = Math.min(thoughtCount / 10, 1); // Normalize to 0-1
    const priorityWeight = priority;
    const stateWeight = isActive ? 1 : 0.5;
    
    // Weighted average
    return (thoughtWeight + priorityWeight + stateWeight) / 3;
  }
}

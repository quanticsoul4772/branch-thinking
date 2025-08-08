import { BranchGraph } from '../branchGraph.js';
import { DifferentialEvaluator } from '../differentialEvaluator.js';
import { ThoughtBranch } from '../types.js';
import { getConfig } from '../config.js';

/**
 * Helper class for analysis operations
 * Handles contradictions, circular reasoning, and path finding
 */
export class AnalysisHelper {
  /**
   * Find contradictions using bloom filter and evaluation
   */
  async findContradictions(
    graph: BranchGraph, 
    evaluator: DifferentialEvaluator
  ): Promise<Array<{branch1: string, branch2: string, reason: string}>> {
    const contradictions: Array<{branch1: string, branch2: string, reason: string}> = [];
    const branches = graph.getAllBranches();
    const config = getConfig();
    
    // Check each branch for internal contradictions
    for (const branch of branches) {
      const result = await evaluator.evaluateIncremental(graph, branch.id);
      
      if (result.contradictionScore > config.evaluation.thresholds.contradiction) {
        contradictions.push({
          branch1: branch.id,
          branch2: branch.id,
          reason: 'Internal contradictions detected'
        });
      }
    }
    
    // Add bloom filter detected contradictions
    const stats = graph.getStatistics();
    const bloomStats = stats.contradictionFilterStats;
    
    if (bloomStats && typeof bloomStats === 'object' && 'positive' in bloomStats && 
        typeof bloomStats.positive === 'object' && 
        bloomStats.positive && 
        'numElements' in bloomStats.positive &&
        (bloomStats.positive as any).numElements > 0) {
      const falsePositiveRate = (bloomStats.positive as any).falsePositiveRate;
      
      if (falsePositiveRate < config.bloomFilter.fprConfidenceThreshold) {
        contradictions.push({
          branch1: 'multiple',
          branch2: 'multiple',
          reason: `Bloom filter detected potential contradictions (FPR: ${falsePositiveRate.toFixed(3)})`
        });
      }
    }
    
    return contradictions;
  }
  
  /**
   * Find strongest paths to a target conclusion
   */
  async findStrongestPaths(
    graph: BranchGraph,
    evaluator: DifferentialEvaluator,
    targetConclusion: string,
    originalGoal: string | null
  ): Promise<ThoughtBranch[]> {
    // Temporarily set goal to target conclusion
    evaluator.setGoal(targetConclusion);
    
    const branches = graph.getAllBranches();
    const results: Array<{branch: any, score: number}> = [];
    
    for (const branch of branches) {
      if (branch.state !== 'active' && branch.state !== 'completed') {
        continue;
      }
      
      const result = await evaluator.evaluateIncremental(graph, branch.id);
      const legacyBranch = graph.toLegacyBranch(branch.id);
      
      if (legacyBranch) {
        results.push({ branch: legacyBranch, score: result.goalAlignment });
      }
    }
    
    // Restore original goal
    if (originalGoal) {
      evaluator.setGoal(originalGoal);
    }
    
    // Return top scoring branches
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, getConfig().display.topResultsCount)
      .map(r => r.branch)
      .filter((b): b is ThoughtBranch => b !== null);
  }
  
  /**
   * Detect circular reasoning patterns
   */
  detectCircularReasoning(graph: BranchGraph): Array<{path: string[], branch: string}> {
    const patterns = (graph as any).detectCircularReasoning();
    const results: Array<{path: string[], branch: string}> = [];
    
    for (const pattern of patterns) {
      if (!pattern.thoughtIds || pattern.thoughtIds.length === 0) {
        continue;
      }
      
      // Find the branch containing the first thought in the pattern
      const firstThoughtId = pattern.thoughtIds[0];
      let branchId = 'unknown';
      
      for (const branch of graph.getAllBranches()) {
        if (branch.thoughts.includes(firstThoughtId)) {
          branchId = branch.id;
          break;
        }
      }
      
      results.push({
        path: pattern.thoughtIds,
        branch: branchId
      });
    }
    
    return results;
  }
  
  /**
   * Prune low-scoring branches
   */
  async pruneLowScoringBranches(
    graph: BranchGraph,
    evaluator: DifferentialEvaluator,
    threshold: number = getConfig().branch.pruneThreshold
  ): Promise<number> {
    const branches = graph.getAllBranches();
    let prunedCount = 0;
    
    for (const branch of branches) {
      if (branch.state !== 'active') {
        continue;
      }
      
      const result = await evaluator.evaluateIncremental(graph, branch.id);
      
      if (result.overallScore < threshold) {
        branch.state = 'dead_end';
        prunedCount++;
      }
    }
    
    return prunedCount;
  }
}

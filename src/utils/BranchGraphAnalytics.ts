import { BranchNode, ThoughtData } from '../types.js';
import { BranchGraphStorage } from './BranchGraphStorage.js';
import { semanticProfileManager } from '../semanticProfile.js';
import { getConfig } from '../config.js';
import {
  ValidationError,
  SemanticAnalysisError,
  ErrorHandler
} from './customErrors.js';

/**
 * Analytics functionality for BranchGraph
 * Handles statistics, comparisons, and analysis
 */
export class BranchGraphAnalytics {
  constructor(private storage: BranchGraphStorage) {}
  
  /**
   * Get basic statistics
   */
  getBasicStats(): {
    totalBranches: number;
    totalThoughts: number;
    activeBranches: number;
    averageThoughtsPerBranch: number;
    branchStateDistribution: Record<string, number>;
    } {
    const branches = this.storage.getAllBranches();
    const totalBranches = branches.length;
    const totalThoughts = branches.reduce((sum, b) => sum + b.thoughts.length, 0);
    const activeBranches = branches.filter(b => b.state === 'active').length;
    
    const stateDistribution: Record<string, number> = {};
    branches.forEach(branch => {
      stateDistribution[branch.state] = (stateDistribution[branch.state] || 0) + 1;
    });
    
    return {
      totalBranches,
      totalThoughts,
      activeBranches,
      averageThoughtsPerBranch: totalBranches > 0 ? totalThoughts / totalBranches : 0,
      branchStateDistribution: stateDistribution
    };
  }
  
  /**
   * Compute cosine similarity between two texts
   */
  computeCosineSimilarity(text1: string, text2: string): number {
    try {
      if (typeof text1 !== 'string') {
        throw new ValidationError('First text parameter must be a string', 'text1', typeof text1);
      }
      if (typeof text2 !== 'string') {
        throw new ValidationError('Second text parameter must be a string', 'text2', typeof text2);
      }
      
      if (text1.length === 0 && text2.length === 0) {
        return 1.0; // Two empty strings are identical
      }
      
      if (text1.length === 0 || text2.length === 0) {
        return 0.0; // One empty string means no similarity
      }
      
      const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 0));
      const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 0));
      
      if (words1.size === 0 && words2.size === 0) {
        return 1.0; // Both texts have no meaningful words
      }
      
      if (words1.size === 0 || words2.size === 0) {
        return 0.0; // One text has no meaningful words
      }
      
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      
      return intersection.size / Math.sqrt(words1.size * words2.size);
    } catch (error) {
      throw ErrorHandler.handle(error);
    }
  }
  
  /**
   * Compare semantic profiles of all branches
   */
  compareProfiles(): {
    branchComparisons: Array<{
      branch1: string;
      branch2: string;
      similarity: number;
      sharedConcepts: string[];
    }>;
    mostSimilarPairs: Array<{ branches: string[]; similarity: number }>;
    mostDistinctBranches: string[];
    } {
    const branches = this.storage.getAllBranches();
    const comparisons: Array<{
      branch1: string;
      branch2: string;
      similarity: number;
      sharedConcepts: string[];
    }> = [];
    
    // Compare all pairs
    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        const branchI = branches[i];
        const branchJ = branches[j];
        if (!branchI || !branchJ) {
          continue;
        }
        
        const profile1 = branchI.semanticProfile;
        const profile2 = branchJ.semanticProfile;
        
        if (!profile1 || !profile2) {
          continue;
        }
        
        const sharedConcepts = this.findSharedConcepts(profile1, profile2);
        const similarity = this.calculateProfileSimilarity(profile1, profile2);
        
        comparisons.push({
          branch1: branchI.id,
          branch2: branchJ.id,
          similarity,
          sharedConcepts
        });
      }
    }
    
    // Find most similar pairs
    const sortedBySimilarity = [...comparisons].sort((a, b) => b.similarity - a.similarity);
    const mostSimilarPairs = sortedBySimilarity.slice(0, 5).map(c => ({
      branches: [c.branch1, c.branch2],
      similarity: c.similarity
    }));
    
    // Find most distinct branches
    const avgSimilarityByBranch = new Map<string, number>();
    branches.forEach(branch => {
      const similarities = comparisons
        .filter(c => c.branch1 === branch.id || c.branch2 === branch.id)
        .map(c => c.similarity);
      
      if (similarities.length > 0) {
        const avg = similarities.reduce((a, b) => a + b, 0) / similarities.length;
        avgSimilarityByBranch.set(branch.id, avg);
      }
    });
    
    const mostDistinctBranches = Array.from(avgSimilarityByBranch.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .map(([branchId]) => branchId);
    
    return {
      branchComparisons: comparisons,
      mostSimilarPairs,
      mostDistinctBranches
    };
  }
  
  /**
   * Find shared concepts between profiles
   */
  private findSharedConcepts(profile1: any, profile2: any): string[] {
    const concepts1 = new Set<string>(profile1.keywords || []);
    const concepts2 = new Set<string>(profile2.keywords || []);
    
    return Array.from(concepts1).filter(c => concepts2.has(c));
  }
  
  /**
   * Calculate similarity between profiles
   */
  private calculateProfileSimilarity(profile1: any, profile2: any): number {
    // Simple overlap ratio for now
    const concepts1 = new Set(profile1.keywords || []);
    const concepts2 = new Set(profile2.keywords || []);
    
    const intersection = new Set([...concepts1].filter(x => concepts2.has(x)));
    const union = new Set([...concepts1, ...concepts2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }
  
  /**
   * Suggest branch merges based on similarity
   */
  async suggestMerges(): Promise<{
    suggestions: Array<{
      branches: string[];
      reason: string;
      similarity: number;
      potentialBenefit: string;
    }>;
  }> {
    const branches = this.storage.getAllBranches();
    const suggestions: Array<{
      branches: string[];
      reason: string;
      similarity: number;
      potentialBenefit: string;
    }> = [];
    
    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        const branch1 = branches[i];
        const branch2 = branches[j];
        
        if (!branch1 || !branch2) {
          continue;
        }
        
        if (!branch1.semanticProfile || !branch2.semanticProfile) {
          continue;
        }
        
        // Use simple cosine similarity for now
        const text1 = branch1.thoughts.map(t => t.content).join(' ');
        const text2 = branch2.thoughts.map(t => t.content).join(' ');
        const similarity = this.computeCosineSimilarity(text1, text2);
        
        if (similarity > 0.7) { // Use fixed threshold
          suggestions.push({
            branches: [branch1.id, branch2.id],
            reason: `High semantic similarity (${(similarity * 100).toFixed(1)}%)`,
            similarity,
            potentialBenefit: this.getMergeBenefit(branch1, branch2)
          });
        }
      }
    }
    
    return { suggestions: suggestions.sort((a, b) => b.similarity - a.similarity) };
  }
  
  /**
   * Get potential benefit of merging branches
   */
  private getMergeBenefit(branch1: BranchNode, branch2: BranchNode): string {
    const totalThoughts = branch1.thoughts.length + branch2.thoughts.length;
    const sharedConcepts = this.findSharedConcepts(
      branch1.semanticProfile!, 
      branch2.semanticProfile!
    );
    
    return `Combine ${totalThoughts} thoughts with ${sharedConcepts.length} shared concepts`;
  }
  
  /**
   * Detect semantic drift in branches
   */
  async detectDrift(): Promise<{
    driftingBranches: Array<{
      branchId: string;
      driftScore: number;
      reason: string;
      recommendation: string;
    }>;
  }> {
    const branches = this.storage.getAllBranches();
    const driftingBranches: Array<{
      branchId: string;
      driftScore: number;
      reason: string;
      recommendation: string;
    }> = [];
    
    for (const branch of branches) {
      if (!branch.semanticProfile || branch.thoughts.length < 3) {
        continue;
      }
      
      const driftAnalysis = await this.analyzeBranchDrift(branch);
      
      if (driftAnalysis.driftScore > 0.5) { // Use fixed threshold
        driftingBranches.push({
          branchId: branch.id,
          driftScore: driftAnalysis.driftScore,
          reason: driftAnalysis.reason,
          recommendation: driftAnalysis.recommendation
        });
      }
    }
    
    return { driftingBranches: driftingBranches.sort((a, b) => b.driftScore - a.driftScore) };
  }
  
  /**
   * Analyze drift within a single branch
   */
  private async analyzeBranchDrift(branch: BranchNode): Promise<{
    driftScore: number;
    reason: string;
    recommendation: string;
  }> {
    const recentThoughts = branch.thoughtIds.slice(-5);
    const earlyThoughts = branch.thoughtIds.slice(0, 5);
    
    let totalDrift = 0;
    let comparisons = 0;
    
    for (const recentId of recentThoughts) {
      for (const earlyId of earlyThoughts) {
        const recent = this.storage.getThought(recentId);
        const early = this.storage.getThought(earlyId);
        
        if (recent && early) {
          const similarity = this.computeCosineSimilarity(recent.content, early.content);
          totalDrift += (1 - similarity);
          comparisons++;
        }
      }
    }
    
    const driftScore = comparisons > 0 ? totalDrift / comparisons : 0;
    
    return {
      driftScore,
      reason: driftScore > 0.7 ? 'Recent thoughts significantly diverge from initial direction' :
        driftScore > 0.5 ? 'Moderate drift from original focus' :
          'Minor drift detected',
      recommendation: driftScore > 0.7 ? 'Consider splitting into separate branches' :
        driftScore > 0.5 ? 'Review branch focus and realign if needed' :
          'Continue with current direction'
    };
  }
}

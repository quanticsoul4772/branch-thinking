import { EvaluationResult } from '../differentialEvaluator.js';
import { AutoEvaluationConfig, EvaluationFeedback, BranchState } from '../types.js';
import { getConfig } from '../config.js';

/**
 * Helper class for evaluation-related operations
 * Extracted from BranchManagerAdapter to reduce complexity
 */
export class EvaluationHelper {
  constructor(private goal: string | null) {}
  
  /**
   * Set goal for evaluation
   */
  setGoal(goal: string | null): void {
    this.goal = goal;
  }
  
  /**
   * Generate feedback from evaluation
   */
  generateFeedback(evaluation: EvaluationResult, autoEvalConfig: AutoEvaluationConfig): EvaluationFeedback {
    const score = evaluation.overallScore;
    const quality = this.determineQuality(score);
    const issues = this.identifyIssues(evaluation);
    const suggestions = this.generateSuggestions(evaluation, issues, quality);
    const shouldPivot = score < autoEvalConfig.threshold;
    
    return { score, quality, issues, suggestions, shouldPivot };
  }
  
  /**
   * Determine quality based on score
   */
  private determineQuality(score: number): 'excellent' | 'good' | 'moderate' | 'poor' {
    const config = getConfig();
    
    if (score > config.evaluation.quality.excellent) {
      return 'excellent';
    }
    if (score > config.evaluation.quality.good) {
      return 'good';
    }
    if (score > config.evaluation.quality.moderate) {
      return 'moderate';
    }
    return 'poor';
  }
  
  /**
   * Identify issues from evaluation
   */
  private identifyIssues(evaluation: EvaluationResult): string[] {
    const issues: string[] = [];
    const config = getConfig();
    
    if (evaluation.coherenceScore < config.evaluation.thresholds.lowCoherence) {
      issues.push('Low coherence - thoughts not well connected');
    }
    
    if (evaluation.contradictionScore > config.evaluation.thresholds.highContradiction) {
      issues.push('High contradiction detected');
    }
    
    if (evaluation.redundancyScore > 0.3) {
      issues.push(this.getRedundancyIssue(evaluation.redundancyScore));
    }
    
    if (evaluation.informationGain < config.evaluation.thresholds.lowInformationGain) {
      issues.push('Low information gain');
    }
    
    if (this.goal && evaluation.goalAlignment < config.evaluation.thresholds.lowGoalAlignment) {
      issues.push('Poor alignment with stated goal');
    }
    
    return issues;
  }
  
  /**
   * Get redundancy issue description
   */
  private getRedundancyIssue(redundancyScore: number): string {
    if (redundancyScore > 0.7) {
      return 'Direct repetition detected - saying the same thing multiple times';
    }
    if (redundancyScore > 0.5) {
      return 'Circular reasoning - returning to previous points without progress';
    }
    return 'Excessive elaboration - adding detail without new concepts';
  }
  
  /**
   * Generate suggestions based on evaluation
   */
  private generateSuggestions(
    evaluation: EvaluationResult, 
    issues: string[], 
    quality: string
  ): string[] {
    const suggestions: string[] = [];
    const config = getConfig();
    
    // Map issues to suggestions
    const issueSuggestionMap: Record<string, string> = {
      'Low coherence - thoughts not well connected': 
        'Try to maintain consistent themes and build logically on previous thoughts',
      'High contradiction detected': 
        'Review for conflicting statements and resolve contradictions',
      'Direct repetition detected - saying the same thing multiple times': 
        'Remove repetitive thoughts or explain why emphasis is needed',
      'Circular reasoning - returning to previous points without progress': 
        'Synthesize insights before revisiting themes',
      'Excessive elaboration - adding detail without new concepts': 
        'Move to the next logical step in your analysis',
      'Low information gain': 
        'Introduce new concepts or dive deeper into specifics',
      'Poor alignment with stated goal': 
        `Refocus on the objective: "${this.goal}"`
    };
    
    // Add suggestions for identified issues
    issues.forEach(issue => {
      const suggestion = issueSuggestionMap[issue];
      if (suggestion) {
        suggestions.push(suggestion);
      }
    });
    
    // Add quality-based suggestions
    if (evaluation.overallScore < config.autoEvaluation.threshold) {
      suggestions.push('Consider pivoting to a different approach or creating a new branch');
    }
    
    if (quality === 'excellent') {
      suggestions.push('Excellent reasoning! Continue building on these insights');
    } else if (quality === 'good') {
      suggestions.push('Good progress. Keep developing this line of thought');
    }
    
    return suggestions;
  }
  
  /**
   * Determine if branch state should be updated based on evaluation
   */
  determineBranchState(evaluation: EvaluationResult): BranchState | null {
    const config = getConfig();
    
    if (evaluation.overallScore < config.branch.deadEndThreshold) {
      return 'dead_end';
    }
    
    const isComplete = evaluation.overallScore > config.branch.completionThreshold && 
                      evaluation.goalAlignment > config.branch.completionGoalAlignment;
    
    if (isComplete) {
      return 'completed';
    }
    
    return null;
  }
}

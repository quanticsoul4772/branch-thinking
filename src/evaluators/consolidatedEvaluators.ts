import { ThoughtBranch, ThoughtData } from '../types.js';
import { BaseEvaluator, EvaluationResult } from './BaseEvaluator.js';
import { semanticSimilarity } from '../semanticSimilarity.js';
import { getConfig } from '../config.js';

/**
 * Coherence Evaluator - measures semantic coherence between consecutive thoughts
 */
export class CoherenceEvaluator extends BaseEvaluator {
  protected evaluatorName = 'CoherenceEvaluator';
  
  protected async performEvaluation(
    branch: ThoughtBranch, 
    parentBranch?: ThoughtBranch,
    goal?: string
  ): Promise<EvaluationResult> {
    const thoughts = branch.thoughts;
    if (thoughts.length < 2) {
      return this.createEmptyResult('coherenceScore', 1.0);
    }

    const similarities = await this.calculateConsecutiveSimilarities(thoughts);
    const coherenceScore = this.calculateAverage(similarities);

    return this.createEmptyResult('coherenceScore', coherenceScore);
  }
  
  private async calculateConsecutiveSimilarities(thoughts: ThoughtData[]): Promise<number[]> {
    const similarities: number[] = [];
    
    for (let i = 1; i < thoughts.length; i++) {
      const prev = thoughts[i-1];
      const curr = thoughts[i];
      if (prev && curr) {
        const similarity = await semanticSimilarity.calculateSimilarity(
          prev.content,
          curr.content
        );
        similarities.push(similarity);
      }
    }
    
    return similarities;
  }
}

/**
 * Redundancy Checker - detects repetitive or circular reasoning
 */
export class RedundancyChecker extends BaseEvaluator {
  protected evaluatorName = 'RedundancyChecker';
  
  protected async performEvaluation(
    branch: ThoughtBranch,
    parentBranch?: ThoughtBranch
  ): Promise<EvaluationResult> {
    const thoughts = branch.thoughts;
    if (thoughts.length < 2) {
      return this.createEmptyResult('redundancyScore', 0.0);
    }

    const redundancyScore = await this.calculateRedundancy(thoughts);
    return this.createEmptyResult('redundancyScore', redundancyScore);
  }
  
  private async calculateRedundancy(thoughts: ThoughtData[]): Promise<number> {
    let totalRedundancy = 0;
    let comparisons = 0;

    // Compare each thought with all others
    for (let i = 0; i < thoughts.length; i++) {
      for (let j = i + 1; j < thoughts.length; j++) {
        const thought1 = thoughts[i];
        const thought2 = thoughts[j];
        if (!thought1 || !thought2) continue;
        const similarity = await semanticSimilarity.calculateSimilarity(
          thought1.content,
          thought2.content
        );
        
        // High similarity between non-consecutive thoughts indicates redundancy
        if (j !== i + 1 && similarity > 0.8) {
          totalRedundancy += similarity;
        }
        comparisons++;
      }
    }

    return comparisons > 0 ? totalRedundancy / comparisons : 0.0;
  }
}

/**
 * Information Gain Calculator - measures new information in each thought
 */
export class InformationGainCalculator extends BaseEvaluator {
  protected evaluatorName = 'InformationGainCalculator';
  
  protected async performEvaluation(
    branch: ThoughtBranch,
    parentBranch?: ThoughtBranch
  ): Promise<EvaluationResult> {
    const thoughts = branch.thoughts;
    if (thoughts.length === 0) {
      return this.createEmptyResult('informationGain', 0.0);
    }

    const gains = await this.calculateInformationGains(thoughts);
    const avgGain = this.calculateAverage(gains);
    
    // Normalize to 0-1 range
    const normalizedGain = Math.tanh(avgGain * 2);
    
    return this.createEmptyResult('informationGain', normalizedGain);
  }
  
  private async calculateInformationGains(thoughts: ThoughtData[]): Promise<number[]> {
    const gains: number[] = [];
    const cumulativeContent: string[] = [];
    
    for (let i = 0; i < thoughts.length; i++) {
      const thought = thoughts[i];
      if (!thought) continue;
      const currentThought = thought.content;
      
      if (i === 0) {
        gains.push(1.0); // First thought has full information gain
        cumulativeContent.push(currentThought);
        continue;
      }
      
      // Calculate novelty compared to all previous content
      const novelty = await this.calculateNovelty(currentThought, cumulativeContent);
      gains.push(novelty);
      cumulativeContent.push(currentThought);
    }
    
    return gains;
  }
  
  private async calculateNovelty(
    currentThought: string, 
    previousThoughts: string[]
  ): Promise<number> {
    const similarities = await Promise.all(
      previousThoughts.map(prev => 
        semanticSimilarity.calculateSimilarity(currentThought, prev)
      )
    );
    
    const maxSimilarity = Math.max(...similarities);
    return 1 - maxSimilarity; // Novelty is inverse of similarity
  }
}

/**
 * Goal Alignment Scorer - measures alignment with stated goal
 */
export class GoalAlignmentScorer extends BaseEvaluator {
  protected evaluatorName = 'GoalAlignmentScorer';
  private goal: string | null = null;
  
  setGoal(goal: string | null): void {
    this.goal = goal;
  }
  
  protected async performEvaluation(
    branch: ThoughtBranch,
    parentBranch?: ThoughtBranch
  ): Promise<EvaluationResult> {
    if (!this.goal || branch.thoughts.length === 0) {
      return this.createEmptyResult('goalAlignment', 0.5);
    }

    const alignments = await this.calculateGoalAlignments(branch.thoughts);
    const avgAlignment = this.calculateAverage(alignments);
    
    return this.createEmptyResult('goalAlignment', avgAlignment);
  }
  
  private async calculateGoalAlignments(thoughts: ThoughtData[]): Promise<number[]> {
    const alignments: number[] = [];
    
    for (const thought of thoughts) {
      const alignment = await semanticSimilarity.calculateSimilarity(
        thought.content,
        this.goal!
      );
      alignments.push(alignment);
    }
    
    return alignments;
  }
}

/**
 * Confidence Analyzer - analyzes confidence trends
 */
export class ConfidenceAnalyzer extends BaseEvaluator {
  protected evaluatorName = 'ConfidenceAnalyzer';
  
  protected async performEvaluation(
    branch: ThoughtBranch,
    parentBranch?: ThoughtBranch
  ): Promise<EvaluationResult> {
    const thoughts = branch.thoughts;
    if (thoughts.length === 0) {
      return this.createEmptyResult('confidenceTrend', 0.5);
    }

    const confidences = thoughts.map(t => t.metadata.confidence);
    const trend = this.calculateConfidenceTrend(confidences);
    
    return this.createEmptyResult('confidenceTrend', trend);
  }
  
  private calculateConfidenceTrend(confidences: number[]): number {
    if (confidences.length < 2) {
      return confidences[0] || 0.5;
    }

    // Calculate linear regression slope
    const n = confidences.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    
    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = confidences.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * (confidences[i] ?? 0), 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Normalize slope to 0-1 range
    // Positive slope = increasing confidence, negative = decreasing
    return this.normalize(slope, -0.1, 0.1);
  }
}

/**
 * Contradiction Detector - finds logical contradictions
 */
export class ContradictionDetector extends BaseEvaluator {
  protected evaluatorName = 'ContradictionDetector';
  
  protected async performEvaluation(
    branch: ThoughtBranch,
    parentBranch?: ThoughtBranch
  ): Promise<EvaluationResult> {
    const thoughts = branch.thoughts;
    if (thoughts.length < 2) {
      return this.createEmptyResult('contradictionScore', 0.0);
    }

    const contradictions = await this.detectContradictions(thoughts);
    const contradictionScore = this.normalize(contradictions, 0, thoughts.length / 2);
    
    return this.createEmptyResult('contradictionScore', contradictionScore);
  }
  
  private async detectContradictions(thoughts: ThoughtData[]): Promise<number> {
    let contradictionCount = 0;
    
    // Simple negation detection
    for (let i = 0; i < thoughts.length; i++) {
      const thoughtI = thoughts[i];
      if (!thoughtI) continue;
      for (let j = i + 1; j < thoughts.length; j++) {
        const thoughtJ = thoughts[j];
        if (!thoughtJ) continue;
        if (await this.areContradictory(thoughtI, thoughtJ)) {
          contradictionCount++;
        }
      }
    }
    
    return contradictionCount;
  }
  
  private async areContradictory(thought1: ThoughtData, thought2: ThoughtData): Promise<boolean> {
    const content1 = thought1.content.toLowerCase();
    const content2 = thought2.content.toLowerCase();
    
    // Simple heuristic: check for negation patterns
    const negationPatterns = ['not', 'no', 'never', 'cannot', 'won\'t', 'shouldn\'t'];
    
    for (const pattern of negationPatterns) {
      if ((content1.includes(pattern) && !content2.includes(pattern)) ||
          (!content1.includes(pattern) && content2.includes(pattern))) {
        // Check if they're talking about the same concept
        const similarity = await semanticSimilarity.calculateSimilarity(
          content1.replace(new RegExp(pattern, 'gi'), ''),
          content2.replace(new RegExp(pattern, 'gi'), '')
        );
        
        if (similarity > 0.7) {
          return true; // Likely contradiction
        }
      }
    }
    
    return false;
  }
}

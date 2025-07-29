/**
 * Enhanced evaluator with semantic similarity
 * Phase 1: Replace Jaccard with embedding-based similarity
 * 
 * This file re-exports the semantic evaluators for backward compatibility
 */

export { 
  SemanticCoherenceEvaluator,
  SemanticRedundancyChecker,
  SemanticGoalAlignmentScorer,
  SemanticInformationGainCalculator
} from './evaluators/semanticEvaluators.js';

export {
  EvaluationResult,
  EvaluationWeights,
  BaseEvaluator,
  ContradictionDetector,
  ConfidenceAnalyzer
} from './evaluators/index.js';

import { ThoughtBranch } from './types.js';
import { 
  BaseEvaluator, 
  EvaluationResult, 
  EvaluationWeights 
} from './evaluators/index.js';
import {
  SemanticCoherenceEvaluator,
  SemanticRedundancyChecker,
  SemanticGoalAlignmentScorer,
  SemanticInformationGainCalculator
} from './evaluators/semanticEvaluators.js';
import { ContradictionDetector, ConfidenceAnalyzer } from './evaluators/index.js';
import { getConfig } from './config.js';
import { semanticSimilarity } from './semanticSimilarity.js';

/**
 * Enhanced Composite Evaluator with semantic capabilities
 */
export class SemanticCompositeEvaluator extends BaseEvaluator {
  protected evaluatorName = 'SemanticCompositeEvaluator';
  private evaluators: BaseEvaluator[];
  private weights: EvaluationWeights;
  private initialized = false;

  constructor(
    evaluators?: BaseEvaluator[],
    weights: EvaluationWeights = getConfig().evaluation.weights
  ) {
    super();
    // Use semantic evaluators by default
    this.evaluators = evaluators || [
      new SemanticCoherenceEvaluator(),
      new ContradictionDetector(), // Keep original for now
      new SemanticInformationGainCalculator(),
      new SemanticGoalAlignmentScorer(),
      new ConfidenceAnalyzer(), // Keep original
      new SemanticRedundancyChecker()
    ];
    this.weights = weights;
  }

  async initialize(): Promise<void> {
    if (!this.initialized) {
      await semanticSimilarity.initialize();
      this.initialized = true;
    }
  }

  protected async performEvaluation(branch: ThoughtBranch, parentBranch?: ThoughtBranch, goal?: string): Promise<EvaluationResult> {
    // Ensure semantic service is initialized
    await this.initialize();
    
    // Evaluate with all evaluators
    const results = await Promise.all(
      this.evaluators.map(evaluator => 
        evaluator.evaluate(branch, parentBranch, goal)
      )
    );

    // Combine results
    const combined: EvaluationResult = {
      coherenceScore: results[0]?.coherenceScore || 0,
      contradictionScore: results[1]?.contradictionScore || 0,
      informationGain: results[2]?.informationGain || 0,
      goalAlignment: results[3]?.goalAlignment || 0,
      confidenceGradient: results[4]?.confidenceGradient || 0,
      redundancyScore: results[5]?.redundancyScore || 0,
      overallScore: 0
    };

    // Calculate weighted overall score
    combined.overallScore = 
      combined.coherenceScore * this.weights.coherence +
      (1 - combined.contradictionScore) * this.weights.contradiction + // Invert because lower is better
      combined.informationGain * this.weights.informationGain +
      combined.goalAlignment * this.weights.goalAlignment +
      ((combined.confidenceGradient + 1) / 2) * this.weights.confidenceGradient + // Normalize to 0-1
      (1 - combined.redundancyScore) * this.weights.redundancy; // Invert because lower is better

    return combined;
  }
}

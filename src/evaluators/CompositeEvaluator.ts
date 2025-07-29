import { ThoughtBranch } from '../types.js';
import { BaseEvaluator, EvaluationResult } from './BaseEvaluator.js';
import { 
  CoherenceEvaluator,
  ContradictionDetector,
  InformationGainCalculator,
  GoalAlignmentScorer,
  ConfidenceAnalyzer,
  RedundancyChecker
} from './consolidatedEvaluators.js';
import { getConfig } from '../config.js';

export interface EvaluationWeights {
  coherence: number;
  contradiction: number;
  informationGain: number;
  goalAlignment: number;
  confidenceGradient: number;
  redundancy: number;
}

export class CompositeEvaluator extends BaseEvaluator {
  protected evaluatorName = 'CompositeEvaluator';
  private evaluators: BaseEvaluator[];
  private weights: EvaluationWeights;

  constructor(
    evaluators?: BaseEvaluator[],
    weights: EvaluationWeights = getConfig().evaluation.weights
  ) {
    super();
    this.evaluators = evaluators || [
      new CoherenceEvaluator(),
      new ContradictionDetector(),
      new InformationGainCalculator(),
      new GoalAlignmentScorer(),
      new ConfidenceAnalyzer(),
      new RedundancyChecker()
    ];
    this.weights = weights;
  }

  protected async performEvaluation(
    branch: ThoughtBranch, 
    parentBranch?: ThoughtBranch, 
    goal?: string
  ): Promise<EvaluationResult> {
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

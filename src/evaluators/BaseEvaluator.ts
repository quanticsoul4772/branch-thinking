import { ThoughtBranch } from '../types.js';

export interface EvaluationResult {
  [key: string]: number;
}

/**
 * Base class for all evaluators
 * Provides common functionality and reduces duplication
 */
export abstract class BaseEvaluator {
  protected abstract evaluatorName: string;
  
  /**
   * Evaluate a branch
   */
  async evaluate(
    branch: ThoughtBranch, 
    parentBranch?: ThoughtBranch,
    goal?: string
  ): Promise<EvaluationResult> {
    try {
      return await this.performEvaluation(branch, parentBranch, goal);
    } catch (error) {
      console.error(`Error in ${this.evaluatorName}:`, error);
      return this.createDefaultResult();
    }
  }
  
  /**
   * Perform the actual evaluation - to be implemented by subclasses
   */
  protected abstract performEvaluation(
    branch: ThoughtBranch, 
    parentBranch?: ThoughtBranch,
    goal?: string
  ): Promise<EvaluationResult>;
  
  /**
   * Create an empty result with a single metric
   */
  protected createEmptyResult(metricName: string, value: number): EvaluationResult {
    return { [metricName]: value };
  }
  
  /**
   * Create default result for error cases
   */
  protected createDefaultResult(): EvaluationResult {
    return this.createEmptyResult(this.getDefaultMetricName(), 0.5);
  }
  
  /**
   * Get the default metric name for this evaluator
   */
  protected getDefaultMetricName(): string {
    // Convert evaluator name to metric name
    // e.g., CoherenceEvaluator -> coherenceScore
    const baseName = this.evaluatorName.replace('Evaluator', '');
    return baseName.charAt(0).toLowerCase() + baseName.slice(1) + 'Score';
  }
  
  /**
   * Calculate average of an array of numbers
   */
  protected calculateAverage(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }
  
  /**
   * Normalize a value to 0-1 range
   */
  protected normalize(value: number, min: number, max: number): number {
    if (max <= min) {
      return 0.5;
    }
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }
}

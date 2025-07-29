// Legacy compatibility file - imports from new modular evaluators
// This file maintains backward compatibility while the codebase is migrated

export {
  EvaluationResult,
  BaseEvaluator,
  EvaluationWeights,
  CoherenceEvaluator,
  ContradictionDetector,
  InformationGainCalculator,
  GoalAlignmentScorer,
  ConfidenceAnalyzer,
  RedundancyChecker,
  CompositeEvaluator
} from './evaluators/index.js';

// Re-export utility functions that were in the original file
import { getConfig } from './config.js';

/**
 * Calculate Jaccard similarity between two sets of words
 * @deprecated Use BaseEvaluator.calculateSimilarity instead
 */
export function jaccardSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Extract key terms from text (simple version - just nouns and important words)
 * @deprecated Use evaluator-specific implementations
 */
export function extractKeyTerms(text: string): Set<string> {
  // Remove common words (simple stopword removal)
  const config = getConfig();
  const stopwords = config.text.stopwords;
  
  return new Set(
    text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopwords.has(word))
  );
}

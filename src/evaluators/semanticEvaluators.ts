// Enhanced evaluators with semantic similarity support
// These evaluators can work with both basic similarity and semantic embeddings

export { 
  CoherenceEvaluator,
  RedundancyChecker,
  GoalAlignmentScorer,
  InformationGainCalculator
} from './index.js';

import { ThoughtBranch } from '../types.js';
import { BaseEvaluator, EvaluationResult } from './BaseEvaluator.js';
import { semanticSimilarity } from '../semanticSimilarity.js';
import { getConfig } from '../config.js';

/**
 * Enhanced Coherence Evaluator that uses semantic embeddings when available
 */
export class SemanticCoherenceEvaluator extends BaseEvaluator {
  protected evaluatorName = 'SemanticCoherenceEvaluator';
  private useSemanticSimilarity: boolean;
  
  constructor(useSemanticSimilarity = true) {
    super();
    this.useSemanticSimilarity = useSemanticSimilarity;
  }
  
  private calculateSimilarity(text1: string, text2: string): number {
    // Basic Jaccard similarity for fallback
    const tokens1 = new Set(text1.toLowerCase().split(/\s+/));
    const tokens2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }
  
  protected async performEvaluation(
    branch: ThoughtBranch, 
    parentBranch?: ThoughtBranch
  ): Promise<EvaluationResult> {
    const thoughts = branch.thoughts;
    if (thoughts.length < 2) {
      return this.createEmptyResult('coherenceScore', 1.0);
    }

    let totalSimilarity = 0;
    let comparisons = 0;

    // Compare each thought with the previous one
    for (let i = 1; i < thoughts.length; i++) {
      const prevThought = thoughts[i-1];
      const currThought = thoughts[i];
      if (!prevThought || !currThought) continue;
      
      const similarity = this.useSemanticSimilarity
        ? await semanticSimilarity.calculateSimilarity(
          prevThought.content,
          currThought.content
        )
        : this.calculateSimilarity(
          prevThought.content,
          currThought.content
        );
      
      totalSimilarity += similarity;
      comparisons++;
    }

    const coherenceScore = comparisons > 0 ? totalSimilarity / comparisons : 1.0;

    return this.createEmptyResult('coherenceScore', coherenceScore);
  }
}

/**
 * Enhanced Redundancy Checker with semantic support
 */
export class SemanticRedundancyChecker extends BaseEvaluator {
  protected evaluatorName = 'SemanticRedundancyChecker';
  private useSemanticSimilarity: boolean;
  
  constructor(useSemanticSimilarity = true) {
    super();
    this.useSemanticSimilarity = useSemanticSimilarity;
  }
  
  private calculateSimilarity(text1: string, text2: string): number {
    // Basic Jaccard similarity for fallback
    const tokens1 = new Set(text1.toLowerCase().split(/\s+/));
    const tokens2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }
  
  protected async performEvaluation(
    branch: ThoughtBranch, 
    parentBranch?: ThoughtBranch
  ): Promise<EvaluationResult> {
    const thoughts = branch.thoughts;
    if (thoughts.length < 2) {
      return this.createEmptyResult('redundancyScore', 0);
    }

    let redundancyCount = 0;
    let totalComparisons = 0;

    // Use sliding window to avoid exponential penalty
    const windowSize = Math.min(3, thoughts.length - 1);
    
    // Only compare each thought with the next few thoughts
    for (let i = 0; i < thoughts.length - 1; i++) {
      const endIndex = Math.min(i + windowSize + 1, thoughts.length);
      for (let j = i + 1; j < endIndex; j++) {
        const thoughtI = thoughts[i];
        const thoughtJ = thoughts[j];
        if (!thoughtI || !thoughtJ) {
          continue;
        }
        
        const similarity = this.useSemanticSimilarity
          ? await semanticSimilarity.calculateSimilarity(
            thoughtI.content, 
            thoughtJ.content
          )
          : this.calculateSimilarity(
            thoughtI.content, 
            thoughtJ.content
          );
        
        if (similarity > getConfig().evaluation.thresholds.similarity) {
          redundancyCount++;
        }
        totalComparisons++;
      }
    }

    const redundancyScore = totalComparisons > 0 
      ? redundancyCount / totalComparisons 
      : 0;

    return this.createEmptyResult('redundancyScore', redundancyScore);
  }
}

/**
 * Enhanced Goal Alignment Scorer with semantic support
 */
export class SemanticGoalAlignmentScorer extends BaseEvaluator {
  protected evaluatorName = 'SemanticGoalAlignmentScorer';
  private useSemanticSimilarity: boolean;
  
  constructor(useSemanticSimilarity = true) {
    super();
    this.useSemanticSimilarity = useSemanticSimilarity;
  }
  
  protected async performEvaluation(
    branch: ThoughtBranch, 
    parentBranch?: ThoughtBranch,
    goal?: string
  ): Promise<EvaluationResult> {
    if (!goal) {
      return this.createEmptyResult('goalAlignment', 0.5);
    }

    if (this.useSemanticSimilarity) {
      // Semantic version using embeddings
      let totalAlignment = 0;
      let thoughtCount = 0;

      // Get goal embedding once
      const goalEmbedding = await semanticSimilarity.getEmbedding(goal);

      for (const thought of branch.thoughts) {
        const thoughtEmbedding = await semanticSimilarity.getEmbedding(thought.content);
        const alignment = semanticSimilarity.cosineSimilarity(goalEmbedding, thoughtEmbedding);
        
        // Convert from [-1, 1] to [0, 1] range
        const normalizedAlignment = (alignment + 1) / 2;
        totalAlignment += normalizedAlignment;
        thoughtCount++;
      }

      const goalAlignment = thoughtCount > 0 ? totalAlignment / thoughtCount : 0;
      return this.createEmptyResult('goalAlignment', goalAlignment);
    } else {
      // Basic version using term matching
      const goalTerms = this.extractKeyTerms(goal);
      let totalAlignment = 0;
      let thoughtCount = 0;

      branch.thoughts.forEach(thought => {
        const thoughtTerms = this.extractKeyTerms(thought.content);
        const commonTerms = new Set([...thoughtTerms].filter(term => goalTerms.has(term)));
        const alignment = goalTerms.size > 0 ? commonTerms.size / goalTerms.size : 0;
        totalAlignment += alignment;
        thoughtCount++;
      });

      const goalAlignment = thoughtCount > 0 ? totalAlignment / thoughtCount : 0;
      return this.createEmptyResult('goalAlignment', goalAlignment);
    }
  }
  
  private extractKeyTerms(text: string): Set<string> {
    const config = getConfig();
    const stopwords = config.text.stopwords;
    
    return new Set(
      text.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopwords.has(word))
    );
  }
}

/**
 * Enhanced Information Gain Calculator with semantic support
 */
export class SemanticInformationGainCalculator extends BaseEvaluator {
  protected evaluatorName = 'SemanticInformationGainCalculator';
  private useSemanticSimilarity: boolean;
  
  constructor(useSemanticSimilarity = true) {
    super();
    this.useSemanticSimilarity = useSemanticSimilarity;
  }
  
  protected async performEvaluation(
    branch: ThoughtBranch, 
    parentBranch?: ThoughtBranch
  ): Promise<EvaluationResult> {
    if (!parentBranch || parentBranch.thoughts.length === 0) {
      return this.createEmptyResult('informationGain', 1.0);
    }

    if (this.useSemanticSimilarity) {
      // Semantic version using embeddings
      const parentEmbeddings = await Promise.all(
        parentBranch.thoughts.map(t => semanticSimilarity.getEmbedding(t.content))
      );
      
      const currentEmbeddings = await Promise.all(
        branch.thoughts.map(t => semanticSimilarity.getEmbedding(t.content))
      );

      // Calculate how much new information is in current branch
      let totalNovelty = 0;
      
      for (const currentEmb of currentEmbeddings) {
        // Find max similarity to any parent thought
        let maxSimilarity = 0;
        for (const parentEmb of parentEmbeddings) {
          const sim = semanticSimilarity.cosineSimilarity(currentEmb, parentEmb);
          maxSimilarity = Math.max(maxSimilarity, sim);
        }
        
        // Novelty is inverse of max similarity
        const novelty = 1 - maxSimilarity;
        totalNovelty += novelty;
      }

      const informationGain = currentEmbeddings.length > 0 
        ? totalNovelty / currentEmbeddings.length 
        : 0;

      return this.createEmptyResult('informationGain', informationGain);
    } else {
      // Basic version using term matching
      const parentTerms = new Set<string>();
      parentBranch.thoughts.forEach(thought => {
        this.extractKeyTerms(thought.content).forEach(term => parentTerms.add(term));
      });

      const currentTerms = new Set<string>();
      branch.thoughts.forEach(thought => {
        this.extractKeyTerms(thought.content).forEach(term => currentTerms.add(term));
      });

      const newTerms = new Set([...currentTerms].filter(term => !parentTerms.has(term)));
      
      const informationGain = currentTerms.size > 0 
        ? newTerms.size / currentTerms.size 
        : 0;

      return this.createEmptyResult('informationGain', informationGain);
    }
  }
  
  private extractKeyTerms(text: string): Set<string> {
    const config = getConfig();
    const stopwords = config.text.stopwords;
    
    return new Set(
      text.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopwords.has(word))
    );
  }
}

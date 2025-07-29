/**
 * Central configuration for branch-thinking
 * All thresholds and weights that control reasoning behavior
 */

export const CONFIG = {
  evaluation: {
    weights: {
      coherence: 0.2,      // How well thoughts flow logically
      contradiction: 0.25, // Penalty for contradicting previous thoughts
      convergence: 0.2,    // Reward for building toward conclusions
      specificity: 0.15,   // Preference for concrete over abstract
      confidence: 0.1,     // Weight of self-assessed confidence
      repetition: 0.1      // Penalty for redundant thoughts
    },
    thresholds: {
      similarity: 0.7,     // When thoughts are considered too similar (0.0-1.0)
      redundancy: 0.5,     // Threshold for marking content as redundant
      contradiction: 0.7,  // Confidence threshold for contradiction detection
      convergence: 0.6,    // When branches are considered converging
      prune: 0.3          // Below this score, branches are pruned
    },
    qualityThresholds: {
      excellent: 0.8,      // Score >= 0.8
      good: 0.6,          // Score >= 0.6
      moderate: 0.4       // Score >= 0.4
    },
    windowSize: 5         // Number of recent thoughts to consider
  },
  tools: {
    suggestionWeights: {
      nameMatch: 0.4,        // Weight for tool name matching
      descriptionMatch: 0.3, // Weight for description matching
      contextMatch: 0.2,     // Weight for context relevance
      frequencyBoost: 0.1    // Boost for frequently used tools
    }
  },
  graph: {
    windowSize: 10,          // Sliding window for graph analysis
    bloomFilter: {
      size: 10000,          // Bloom filter size
      hashFunctions: 5      // Number of hash functions
    }
  },
  display: {
    thoughtCharacterLimit: 80,  // Max characters to show per thought
    recentThoughtCount: 3,      // Number of recent thoughts to display
    strongestPathsCount: 5,     // Number of strongest paths to show
    maxThoughtsToShow: 10       // Maximum thoughts in display
  },
  autoEval: {
    enabled: true,              // Auto-evaluate thoughts
    threshold: 0.35             // Min score to trigger auto-eval
  }
};

// Type export for TypeScript support
export type BranchThinkingConfig = typeof CONFIG;

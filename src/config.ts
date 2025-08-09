/**
 * Central configuration for branch-thinking
 * Eliminates hardcoded values throughout the codebase
 */

import { ConfigValue } from './types/interfaces.js';

export interface BranchThinkingConfig {
  text: {
    stopwords: Set<string>;
    minWordLength: number;
    maxWordLength?: number;
  };
  
  evaluation: {
    weights: {
      coherence: number;
      contradiction: number;
      informationGain: number;
      goalAlignment: number;
      confidenceGradient: number;
      redundancy: number;
    };
    thresholds: {
      similarity: number;
      redundancy: number;
      contradiction: number;
      lowCoherence: number;
      highContradiction: number;
      lowInformationGain: number;
      lowGoalAlignment: number;
    };
    quality: {
      excellent: number;
      good: number;
      moderate: number;
    };
    maxContentLength: number;
    maxTraversalDepth: number;
    maxResultCount: number;
  };
  
  branch: {
    defaultConfidence: number;
    defaultPriority: number;
    pruneThreshold: number;
    deadEndThreshold: number;
    completionThreshold: number;
    completionGoalAlignment: number;
  };
  
  display: {
    thoughtCharLimit: number;
    branchSummaryCharLimit: number;
    recentThoughtsCount: number;
    topResultsCount: number;
    historyThoughtsCount: number;
  };
  
  cache: {
    similarityCacheSize: number;
    processedTextsCacheSize: number;
    termCacheSize: number;
  };
  
  matrix: {
    initialSize: number;
    growthFactor: number;
    sparseThreshold: number;
    similarityThreshold: number;
    clusteringMinSimilarity: number;
  };
  
  bloomFilter: {
    expectedElements: number;
    falsePositiveRate: number;
    contradictionFilters: {
      positive: { size: number; fpr: number };
      negative: { size: number; fpr: number };
      conceptPairs: { size: number; fpr: number };
    };
    fprConfidenceThreshold: number;
  };
  
  hash: {
    substringLength: number;
  };
  
  patterns: {
    contradiction: RegExp[];
    premise: RegExp[];
    conclusion: RegExp[];
    dependency: RegExp[];
  };
  
  tools: {
    relevanceThreshold: number;
    suggestionCount: number;
  };
  
  autoEvaluation: {
    enabled: boolean;
    threshold: number;
  };
}

// Default configuration
export const DEFAULT_CONFIG: BranchThinkingConfig = {
  text: {
    stopwords: new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this', 'it',
      'from', 'be', 'are', 'was', 'were', 'been', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
      'might', 'must', 'can', 'need', 'want', 'think', 'know', 'see',
      'seem', 'come', 'go', 'get', 'make', 'take', 'use'
    ]),
    minWordLength: 3,
    maxWordLength: 50
  },
  
  evaluation: {
    weights: {
      coherence: 0.15,
      contradiction: 0.15,
      informationGain: 0.25,
      goalAlignment: 0.2,
      confidenceGradient: 0.15,
      redundancy: 0.1
    },
    thresholds: {
      similarity: 0.85,
      redundancy: 0.85,
      contradiction: 0.4,
      lowCoherence: 0.4,
      highContradiction: 0.6,
      lowInformationGain: 0.2,
      lowGoalAlignment: 0.2
    },
    quality: {
      excellent: 0.75,
      good: 0.55,
      moderate: 0.35
    },
    maxContentLength: 10000,
    maxTraversalDepth: 1000,
    maxResultCount: 1000
  },
  
  branch: {
    defaultConfidence: 1.0,
    defaultPriority: 1.0,
    pruneThreshold: 0.2,
    deadEndThreshold: 0.2,
    completionThreshold: 0.8,
    completionGoalAlignment: 0.8
  },
  
  display: {
    thoughtCharLimit: 80,
    branchSummaryCharLimit: 50,
    recentThoughtsCount: 3,
    topResultsCount: 5,
    historyThoughtsCount: 10
  },
  
  cache: {
    similarityCacheSize: 1000,
    processedTextsCacheSize: 500,
    termCacheSize: 2000
  },
  
  matrix: {
    initialSize: 1000,
    growthFactor: 2,
    sparseThreshold: 0.1,
    similarityThreshold: 0.3,
    clusteringMinSimilarity: 0.5
  },
  
  bloomFilter: {
    expectedElements: 10000,
    falsePositiveRate: 0.01,
    contradictionFilters: {
      positive: { size: 5000, fpr: 0.001 },
      negative: { size: 5000, fpr: 0.001 },
      conceptPairs: { size: 10000, fpr: 0.01 }
    },
    fprConfidenceThreshold: 0.1
  },
  
  hash: {
    substringLength: 16
  },
  
  patterns: {
    contradiction: [
      /not\s+(.+)/,
      /never\s+(.+)/,
      /(.+)\s+is\s+false/,
      /(.+)\s+is\s+wrong/,
      /disagree\s+with\s+(.+)/,
      /(.+)\s+but\s+(.+)/,
      /however\s+(.+)/,
      /on\s+the\s+contrary/
    ],
    premise: [
      /(?:given|assuming|if|suppose|let's say|premise:)\s+([^,.]+)/g,
      /(?:based on|according to|from)\s+([^,.]+)/g,
      /(?:because|since|as)\s+([^,.]+)/g
    ],
    conclusion: [
      /(?:therefore|thus|hence|so|consequently)\s+([^,.]+)/g,
      /(?:this means|this shows|we can conclude)\s+([^,.]+)/g,
      /(?:proves|demonstrates|indicates)\s+([^,.]+)/g
    ],
    dependency: [
      /(?:as shown in|see|refer to|from)\s+thought[- ]?(\w+)/g,
      /(?:building on|extending|following)\s+(\w+)/g
    ]
  },
  
  tools: {
    relevanceThreshold: 0.1,
    suggestionCount: 5
  },
  
  autoEvaluation: {
    enabled: true,
    threshold: 0.25
  }
};

// Configuration loader with environment variable support
export class ConfigLoader {
  private static instance: BranchThinkingConfig | null = null;
  
  static load(): BranchThinkingConfig {
    if (this.instance) {
      return this.instance;
    }
    
    // Start with defaults
    const config = { ...DEFAULT_CONFIG };
    
    // Override with environment variables if present
    if (process.env.BRANCH_THINKING_CONFIG) {
      try {
        const envConfig = JSON.parse(process.env.BRANCH_THINKING_CONFIG);
        this.deepMerge(config, envConfig);
      } catch (e) {
        // Failed to parse BRANCH_THINKING_CONFIG - silently skip
      }
    }
    
    // Individual environment variable overrides
    if (process.env.BT_MIN_WORD_LENGTH) {
      config.text.minWordLength = parseInt(process.env.BT_MIN_WORD_LENGTH);
    }
    
    if (process.env.BT_PRUNE_THRESHOLD) {
      config.branch.pruneThreshold = parseFloat(process.env.BT_PRUNE_THRESHOLD);
    }
    
    if (process.env.BT_AUTO_EVAL_ENABLED) {
      config.autoEvaluation.enabled = process.env.BT_AUTO_EVAL_ENABLED === 'true';
    }
    
    this.instance = config;
    return config;
  }
  
  private static deepMerge(target: ConfigValue, source: ConfigValue): void {
    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        if (source[key] instanceof Set) {
          target[key] = new Set(source[key]);
        } else if (Array.isArray(source[key])) {
          target[key] = [...source[key]];
        } else {
          this.deepMerge(target[key], source[key]);
        }
      } else {
        target[key] = source[key];
      }
    }
  }
  
  static reload(): void {
    this.instance = null;
  }
}

// Export convenience function
export const getConfig = (): BranchThinkingConfig => ConfigLoader.load();

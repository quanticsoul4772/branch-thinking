/**
 * Constants used throughout branch-thinking
 * These are implementation details rather than tunable parameters
 */

export const CONSTANTS = {
  // Cache and memory limits
  CACHE_SIZE: 1000,
  MATRIX_MAX_DIMENSION: 1000,
  
  // Bloom filter settings
  BLOOM_FILTER_SIZE: 10000,
  BLOOM_FILTER_FALSE_POSITIVE_THRESHOLD: 0.1,
  
  // Text processing
  MIN_WORD_LENGTH: 3,
  DEFAULT_WINDOW_SIZE: 5,
  HASH_SUBSTRING_LENGTH: 16,
  
  // Branch management
  MAX_BRANCH_DEPTH: 10,
  MAX_ACTIVE_BRANCHES: 20,
  
  // Performance
  DEBOUNCE_DELAY: 300,
  MAX_COMPUTATION_TIME: 5000, // ms
  
  // Defaults
  DEFAULT_CONFIDENCE: 0.5,
  DEFAULT_PRIORITY: 1
};

/**
 * Shared text processing utilities and constants
 */

import { CONSTANTS } from './constants';

// Comprehensive stopwords list for filtering
export const STOPWORDS = new Set([
  // Articles
  'a', 'an', 'the',
  
  // Pronouns
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  
  // Verbs
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
  'will', 'would', 'should', 'could', 'ought', 'may', 'might',
  'must', 'can', 'shall',
  
  // Prepositions
  'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against',
  'between', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'to', 'from', 'up', 'down', 'out', 'off',
  'over', 'under', 'again', 'further', 'then', 'once',
  
  // Conjunctions
  'and', 'but', 'or', 'because', 'as', 'until', 'while',
  'of', 'at', 'by', 'for', 'with', 'about', 'against',
  'between', 'into', 'through', 'during', 'before', 'after',
  
  // Other common words
  'here', 'there', 'when', 'where', 'why', 'how', 'all',
  'both', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 's', 't', 'can', 'will', 'just',
  'don', 'should', 'now'
]);

/**
 * Preprocess text for analysis
 * @param text - Raw text to process
 * @returns Array of processed words
 */
export function preprocessText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => 
      word.length >= CONSTANTS.MIN_WORD_LENGTH && 
      !STOPWORDS.has(word)
    );
}

/**
 * Calculate word frequency in text
 * @param words - Array of words
 * @returns Map of word to frequency
 */
export function calculateWordFrequency(words: string[]): Map<string, number> {
  const frequency = new Map<string, number>();
  
  for (const word of words) {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  }
  
  return frequency;
}

/**
 * Extract key terms from text based on frequency
 * @param text - Text to analyze
 * @param topN - Number of top terms to return
 * @returns Array of key terms
 */
export function extractKeyTerms(text: string, topN: number = 5): string[] {
  const words = preprocessText(text);
  const frequency = calculateWordFrequency(words);
  
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

/**
 * Calculate Jaccard similarity between two sets of words
 * @param set1 - First word set
 * @param set2 - Second word set
 * @returns Similarity score (0.0 - 1.0)
 */
export function calculateJaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Tokenize text into sentences
 * @param text - Text to tokenize
 * @returns Array of sentences
 */
export function tokenizeSentences(text: string): string[] {
  // Simple sentence tokenization - can be improved with better rules
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

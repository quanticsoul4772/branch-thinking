/**
 * Shared text processing utilities
 * Eliminates duplicate text processing code across the project
 */

import { getConfig } from './config.js';

export class TextUtils {
  private static config = getConfig();
  
  /**
   * Extract meaningful terms from text
   * Used across evaluators, analyzers, and detectors
   */
  static extractTerms(text: string): Set<string> {
    const config = this.config.text;
    const words = text.toLowerCase()
      .split(/\s+/)
      .map(w => w.replace(/[^a-z0-9]/gi, ''))
      .filter(w => 
        w.length >= config.minWordLength && 
        (!config.maxWordLength || w.length <= config.maxWordLength) &&
        !config.stopwords.has(w)
      );
    
    return new Set(words);
  }
  
  /**
   * Extract key terms (alias for backward compatibility)
   */
  static extractKeyTerms(text: string): Set<string> {
    return this.extractTerms(text);
  }
  
  /**
   * Calculate Jaccard similarity between two texts
   */
  static calculateJaccardSimilarity(text1: string, text2: string): number {
    const terms1 = this.extractTerms(text1);
    const terms2 = this.extractTerms(text2);
    
    const intersection = new Set([...terms1].filter(x => terms2.has(x)));
    const union = new Set([...terms1, ...terms2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }
  
  /**
   * Calculate cosine similarity between two texts
   */
  static calculateCosineSimilarity(text1: string, text2: string): number {
    const terms1 = this.extractTerms(text1);
    const terms2 = this.extractTerms(text2);
    
    const intersection = new Set([...terms1].filter(x => terms2.has(x)));
    
    if (terms1.size === 0 || terms2.size === 0) {
      return 0;
    }
    
    return intersection.size / Math.sqrt(terms1.size * terms2.size);
  }
  
  /**
   * Check if two concepts are similar
   */
  static areSimilarConcepts(concept1: string, concept2: string, threshold?: number): boolean {
    const similarity = this.calculateJaccardSimilarity(concept1, concept2);
    return similarity > (threshold || this.config.evaluation.thresholds.similarity);
  }
  
  /**
   * Extract n-grams from text
   */
  static extractNGrams(text: string, n: number = 2): string[] {
    const words = text.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 0);
    
    const ngrams: string[] = [];
    for (let i = 0; i <= words.length - n; i++) {
      ngrams.push(words.slice(i, i + n).join('_'));
    }
    
    return ngrams;
  }
  
  /**
   * Normalize text for comparison
   */
  static normalize(text: string): string {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Get term frequency map
   */
  static getTermFrequency(text: string): Map<string, number> {
    const terms = Array.from(this.extractTerms(text));
    const frequency = new Map<string, number>();
    
    for (const term of terms) {
      frequency.set(term, (frequency.get(term) || 0) + 1);
    }
    
    return frequency;
  }
  
  /**
   * Reload configuration (for testing or runtime updates)
   */
  static reloadConfig(): void {
    this.config = getConfig();
  }
}

/**
 * Pattern matcher utility
 */
export class PatternMatcher {
  private static config = getConfig();
  
  /**
   * Check for contradiction patterns
   */
  static detectContradictionPatterns(text: string): Array<{pattern: RegExp, match: string}> {
    const matches: Array<{pattern: RegExp, match: string}> = [];
    const normalized = text.toLowerCase();
    
    for (const pattern of this.config.patterns.contradiction) {
      const match = normalized.match(pattern);
      if (match) {
        matches.push({ pattern, match: match[0] });
      }
    }
    
    return matches;
  }
  
  /**
   * Extract premises from text
   */
  static extractPremises(text: string): string[] {
    const premises: string[] = [];
    const normalized = text.toLowerCase();
    
    for (const pattern of this.config.patterns.premise) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags || 'g');
      while ((match = regex.exec(normalized)) !== null) {
        if (match[1]) {
          premises.push(match[1].trim());
        }
      }
    }
    
    return premises;
  }
  
  /**
   * Extract conclusions from text
   */
  static extractConclusions(text: string): string[] {
    const conclusions: string[] = [];
    const normalized = text.toLowerCase();
    
    for (const pattern of this.config.patterns.conclusion) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags || 'g');
      while ((match = regex.exec(normalized)) !== null) {
        if (match[1]) {
          conclusions.push(match[1].trim());
        }
      }
    }
    
    return conclusions;
  }
  
  /**
   * Extract dependencies from text
   */
  static extractDependencies(text: string): string[] {
    const dependencies: string[] = [];
    const normalized = text.toLowerCase();
    
    for (const pattern of this.config.patterns.dependency) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags || 'g');
      while ((match = regex.exec(normalized)) !== null) {
        if (match[1]) {
          dependencies.push(match[1].trim());
        }
      }
    }
    
    return dependencies;
  }
  
  /**
   * Check if text contains negation
   */
  static containsNegation(text: string): boolean {
    return /\b(not|no|never|cannot|won't|shouldn't|isn't|aren't|wasn't|weren't)\b/i.test(text);
  }
  
  /**
   * Check if text contains affirmation
   */
  static containsAffirmation(text: string): boolean {
    return /\b(is|are|can|will|should|must|always|certainly|definitely)\b/i.test(text);
  }
}

/**
 * Concept extractor for enhanced text analysis
 */
export class ConceptExtractor {
  /**
   * Extract concepts from text (words and bigrams)
   */
  static extractConcepts(text: string): string[] {
    const words = TextUtils.extractTerms(text);
    const bigrams = TextUtils.extractNGrams(text, 2);
    
    return [...Array.from(words), ...bigrams];
  }
  
  /**
   * Extract noun phrases (simple heuristic)
   */
  static extractNounPhrases(text: string): string[] {
    // Simple pattern for adjective + noun combinations
    const pattern = /\b(\w+\s+)?(noun|system|process|method|approach|concept|idea|theory|model|framework)\b/gi;
    const matches: string[] = [];
    
    let match;
    while ((match = pattern.exec(text)) !== null) {
      matches.push(match[0].trim());
    }
    
    return matches;
  }
  
  /**
   * Extract entities (capitalized words that aren't sentence starters)
   */
  static extractEntities(text: string): string[] {
    const sentences = text.split(/[.!?]+/);
    const entities = new Set<string>();
    
    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);
      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        if (word && /^[A-Z][a-z]+/.test(word)) {
          entities.add(word);
        }
      }
    }
    
    return Array.from(entities);
  }
}

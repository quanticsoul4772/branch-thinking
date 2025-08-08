/**
 * Bloom Filter for fast contradiction pre-checking
 * Optimized for Claude's usage patterns
 */

import { getConfig } from './config.js';

export class BloomFilter {
  private bits: Uint8Array;
  private size: number;
  private hashFunctions: number;
  private numElements = 0;

  constructor(expectedElements?: number, falsePositiveRate?: number) {
    const config = getConfig();
    expectedElements = expectedElements ?? config.bloomFilter.expectedElements;
    falsePositiveRate = falsePositiveRate ?? config.bloomFilter.falsePositiveRate;
    
    // Calculate optimal size and hash functions
    const { optimalSize, optimalHashFunctions } = this.calculateOptimalParameters(
      expectedElements, 
      falsePositiveRate
    );
    
    this.size = optimalSize;
    this.hashFunctions = optimalHashFunctions;
    
    // Initialize bit array
    const byteSize = Math.ceil(this.size / 8);
    this.bits = new Uint8Array(byteSize);
  }

  /**
   * Calculate optimal bloom filter parameters
   */
  private calculateOptimalParameters(
    expectedElements: number, 
    falsePositiveRate: number
  ): { optimalSize: number; optimalHashFunctions: number } {
    const optimalSize = Math.ceil(
      (-expectedElements * Math.log(falsePositiveRate)) / (Math.log(2) ** 2)
    );
    const optimalHashFunctions = Math.ceil(
      (optimalSize / expectedElements) * Math.log(2)
    );
    
    return { optimalSize, optimalHashFunctions };
  }

  /**
   * Hash functions using double hashing
   */
  private hash(item: string, seed: number): number {
    let hash = 0;
    const str = item + seed;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash) % this.size;
  }

  /**
   * Add an item to the filter
   */
  add(item: string): void {
    for (let i = 0; i < this.hashFunctions; i++) {
      const index = this.hash(item, i);
      this.setBit(index);
    }
    this.numElements++;
  }

  /**
   * Set a bit at the given index
   */
  private setBit(index: number): void {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    if (this.bits && byteIndex < this.bits.length && this.bits[byteIndex] !== undefined) {
      this.bits[byteIndex] |= (1 << bitIndex);
    }
  }

  /**
   * Check if an item might be in the set
   */
  contains(item: string): boolean {
    for (let i = 0; i < this.hashFunctions; i++) {
      const index = this.hash(item, i);
      if (!this.isBitSet(index)) {
        return false; // Definitely not in set
      }
    }
    return true; // Might be in set
  }

  /**
   * Check if a bit is set at the given index
   */
  private isBitSet(index: number): boolean {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    if (!this.bits || byteIndex >= this.bits.length) {
      return false;
    }
    const byte = this.bits[byteIndex];
    if (byte === undefined) {
      return false;
    }
    return (byte & (1 << bitIndex)) !== 0;
  }

  /**
   * Estimate false positive rate
   */
  getFalsePositiveRate(): number {
    const ratio = this.numElements / this.size;
    return Math.pow(1 - Math.exp(-this.hashFunctions * ratio), this.hashFunctions);
  }

  /**
   * Clear the filter
   */
  clear(): void {
    this.bits.fill(0);
    this.numElements = 0;
  }

  /**
   * Get filter statistics
   */
  getStats() {
    return {
      size: this.size,
      hashFunctions: this.hashFunctions,
      numElements: this.numElements,
      falsePositiveRate: this.getFalsePositiveRate(),
      sizeInBytes: this.bits.length
    };
  }
}

/**
 * Contradiction Bloom Filter
 * Specialized for detecting potential contradictions
 */
export class ContradictionBloomFilter {
  private positiveAssertions: BloomFilter;
  private negativeAssertions: BloomFilter;
  private conceptPairs: BloomFilter;

  constructor() {
    // Separate filters for different contradiction types
    const config = getConfig();
    this.positiveAssertions = new BloomFilter(
      config.bloomFilter.contradictionFilters.positive.size,
      config.bloomFilter.contradictionFilters.positive.fpr
    );
    this.negativeAssertions = new BloomFilter(
      config.bloomFilter.contradictionFilters.negative.size,
      config.bloomFilter.contradictionFilters.negative.fpr
    );
    this.conceptPairs = new BloomFilter(
      config.bloomFilter.contradictionFilters.conceptPairs.size,
      config.bloomFilter.contradictionFilters.conceptPairs.fpr
    );
  }

  /**
   * Extract key concepts from text
   */
  private extractConcepts(text: string): string[] {
    const cleanedText = text.toLowerCase().replace(/[^\w\s]/g, ' ');
    const words = this.extractWords(cleanedText);
    const concepts = this.buildConcepts(words);
    
    return [...new Set(concepts)];
  }

  /**
   * Extract words from cleaned text
   */
  private extractWords(text: string): string[] {
    const minLength = getConfig().text.minWordLength;
    return text.split(/\s+/).filter(w => w.length > minLength);
  }

  /**
   * Build concepts from words
   */
  private buildConcepts(words: string[]): string[] {
    const concepts: string[] = [];
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (word) {
        concepts.push(word);
        
        if (i < words.length - 1 && words[i + 1]) {
          concepts.push(`${word}_${words[i + 1]}`);
        }
      }
    }
    
    return concepts;
  }

  /**
   * Add a thought and check for potential contradictions
   */
  checkAndAdd(thoughtContent: string): {
    potentialContradiction: boolean;
    contradictionTypes: string[];
  } {
    const concepts = this.extractConcepts(thoughtContent);
    const sentiment = this.analyzeSentiment(thoughtContent);
    
    // Check for contradictions
    const contradictionTypes = [
      ...this.checkConceptContradictions(concepts, sentiment),
      ...this.checkRelationalContradictions(concepts)
    ];
    
    // Add concepts to appropriate filters
    this.addConceptsToFilters(concepts, sentiment);
    
    return {
      potentialContradiction: contradictionTypes.length > 0,
      contradictionTypes: [...new Set(contradictionTypes)]
    };
  }

  /**
   * Analyze sentiment of thought content
   */
  private analyzeSentiment(text: string): { isNegative: boolean; isPositive: boolean } {
    const isNegative = /\b(not|no|never|cannot|won't|shouldn't)\b/i.test(text);
    const isPositive = /\b(is|are|can|will|should|must)\b/i.test(text);
    
    return { isNegative, isPositive };
  }

  /**
   * Check for concept-level contradictions
   */
  private checkConceptContradictions(
    concepts: string[], 
    sentiment: { isNegative: boolean; isPositive: boolean }
  ): string[] {
    const contradictions: string[] = [];
    
    for (const concept of concepts) {
      if (sentiment.isNegative && this.positiveAssertions.contains(concept)) {
        contradictions.push('negation');
      }
      
      if (sentiment.isPositive && this.negativeAssertions.contains(concept)) {
        contradictions.push('affirmation');
      }
    }
    
    return contradictions;
  }

  /**
   * Check for relational contradictions
   */
  private checkRelationalContradictions(concepts: string[]): string[] {
    const contradictions: string[] = [];
    
    for (let i = 0; i < concepts.length - 1; i++) {
      const reversePair = `${concepts[i + 1]}|${concepts[i]}`;
      
      if (this.conceptPairs.contains(reversePair)) {
        contradictions.push('relational');
      }
    }
    
    return contradictions;
  }

  /**
   * Add concepts to appropriate filters
   */
  private addConceptsToFilters(
    concepts: string[], 
    sentiment: { isNegative: boolean; isPositive: boolean }
  ): void {
    // Add individual concepts
    for (const concept of concepts) {
      if (sentiment.isNegative) {
        this.negativeAssertions.add(concept);
      }
      if (sentiment.isPositive) {
        this.positiveAssertions.add(concept);
      }
    }
    
    // Add concept pairs
    for (let i = 0; i < concepts.length - 1; i++) {
      const pair = `${concepts[i]}|${concepts[i + 1]}`;
      this.conceptPairs.add(pair);
    }
  }

  /**
   * Get filter statistics
   */
  getStats() {
    return {
      positive: this.positiveAssertions.getStats(),
      negative: this.negativeAssertions.getStats(),
      pairs: this.conceptPairs.getStats()
    };
  }
}

/**
 * Topic Extractor
 * Extracts main topics from thoughts
 */

import { ThoughtData } from '../types.js';

export class TopicExtractor {
  private readonly stopWords = new Set([
    'this', 'that', 'these', 'those', 'which', 'where', 'when', 'what', 'with',
    'from', 'into', 'have', 'been', 'will', 'would', 'could', 'should', 'might',
    'about', 'after', 'before', 'during', 'under', 'over', 'through', 'between'
  ]);

  /**
   * Extract main topic from thoughts
   */
  extractMainTopic(thoughts: ThoughtData[]): string {
    const wordFrequencies = this.calculateWordFrequencies(thoughts);
    const topWords = this.getTopWords(wordFrequencies, 3);
    return topWords.join(' ');
  }

  /**
   * Calculate word frequencies from thoughts
   */
  private calculateWordFrequencies(thoughts: ThoughtData[]): Map<string, number> {
    const frequencies = new Map<string, number>();

    for (const thought of thoughts) {
      const words = this.extractWords(thought.content);
      
      for (const word of words) {
        frequencies.set(word, (frequencies.get(word) || 0) + 1);
      }
    }

    return frequencies;
  }

  /**
   * Extract meaningful words from text
   */
  private extractWords(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => this.isValidWord(word))
      .filter(word => !this.stopWords.has(word));
  }

  /**
   * Check if word is valid (not too short, not a stop word)
   */
  private isValidWord(word: string): boolean {
    return word.length > 4 && /^[a-z]+$/.test(word);
  }

  /**
   * Get top N words by frequency
   */
  private getTopWords(frequencies: Map<string, number>, count: number): string[] {
    return Array.from(frequencies.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([word]) => word);
  }

  /**
   * Extract key phrases (multi-word topics)
   */
  extractKeyPhrases(thoughts: ThoughtData[]): string[] {
    const phrases: string[] = [];
    const phrasePattern = /(?:about|regarding|concerning|related to) ([^.,;!?]+)/gi;

    for (const thought of thoughts) {
      let match;
      while ((match = phrasePattern.exec(thought.content)) !== null) {
        phrases.push(match[1].trim());
      }
    }

    return [...new Set(phrases)]; // Deduplicate
  }
}

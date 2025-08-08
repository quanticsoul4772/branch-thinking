/**
 * Contradiction Detector
 * Detects different types of contradictions between thoughts
 */

import { ThoughtData } from '../types.js';

export interface ContradictionPoint {
  thought1: string;
  thought2: string;
  type: 'direct' | 'implicit' | 'assumption';
}

export class ContradictionDetector {
  private readonly negationPairs = [
    ['will', 'will not'],
    ['can', 'cannot'],
    ['should', 'should not'],
    ['increases', 'decreases'],
    ['improves', 'worsens'],
    ['beneficial', 'harmful'],
    ['positive', 'negative'],
    ['true', 'false'],
    ['yes', 'no']
  ];

  private readonly opposingQuantifiers = [
    ['all', 'none'],
    ['always', 'never'],
    ['everyone', 'no one'],
    ['everything', 'nothing']
  ];

  /**
   * Detect all contradictions between two sets of thoughts
   */
  detectContradictions(
    thoughts1: ThoughtData[],
    thoughts2: ThoughtData[]
  ): ContradictionPoint[] {
    const direct = this.detectDirectContradictions(thoughts1, thoughts2);
    const implicit = this.detectImplicitContradictions(thoughts1, thoughts2);
    const assumption = this.detectAssumptionContradictions(thoughts1, thoughts2);

    return [...direct, ...implicit, ...assumption];
  }

  /**
   * Detect direct contradictions
   */
  private detectDirectContradictions(
    thoughts1: ThoughtData[],
    thoughts2: ThoughtData[]
  ): ContradictionPoint[] {
    const contradictions: ContradictionPoint[] = [];
    const pairs = this.createThoughtPairs(thoughts1, thoughts2);
    
    for (const [t1, t2] of pairs) {
      const contradiction = this.checkDirectContradiction(t1, t2);
      if (contradiction) {
        contradictions.push(contradiction);
      }
    }

    return contradictions;
  }

  /**
   * Check for direct contradiction between two thoughts
   */
  private checkDirectContradiction(t1: ThoughtData, t2: ThoughtData): ContradictionPoint | null {
    if (!this.hasDirectContradiction(t1.content, t2.content)) {
      return null;
    }

    return {
      thought1: t1.content,
      thought2: t2.content,
      type: 'direct'
    };
  }

  /**
   * Check if two texts have direct contradiction
   */
  private hasDirectContradiction(text1: string, text2: string): boolean {
    if (!text1 || !text2) return false;
    const lower1 = text1.toLowerCase();
    const lower2 = text2.toLowerCase();

    // Check negation pairs
    const hasNegation = this.checkNegationPairs(lower1, lower2);
    
    // Check opposing quantifiers
    const hasOpposingQuantifiers = this.checkOpposingQuantifiers(lower1, lower2);

    if (!hasNegation && !hasOpposingQuantifiers) {
      return false;
    }

    // Verify they're about the same subject
    return this.haveSimilarSubject(text1, text2);
  }

  /**
   * Check for negation pairs in texts
   */
  private checkNegationPairs(text1: string, text2: string): boolean {
    if (!text1 || !text2) return false;
    const t1 = text1; // Ensure TypeScript knows these are defined
    const t2 = text2;
    return this.negationPairs.some(([term1, term2]) => {
      if (!term1 || !term2) return false;
      return (t1.includes(term1) && t2.includes(term2)) ||
             (t1.includes(term2) && t2.includes(term1));
    });
  }

  /**
   * Check for opposing quantifiers in texts
   */
  private checkOpposingQuantifiers(text1: string, text2: string): boolean {
    if (!text1 || !text2) return false;
    const t1 = text1; // Ensure TypeScript knows these are defined
    const t2 = text2;
    return this.opposingQuantifiers.some(([q1, q2]) => {
      if (!q1 || !q2) return false;
      return (t1.includes(q1) && t2.includes(q2)) ||
             (t1.includes(q2) && t2.includes(q1));
    });
  }

  /**
   * Check if texts are about similar subjects
   */
  private haveSimilarSubject(text1: string, text2: string): boolean {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const commonWords = words1.filter(w => words2.includes(w)).length;
    const similarity = commonWords / Math.max(words1.length, words2.length);
    return similarity > 0.3;
  }

  /**
   * Detect implicit contradictions through incompatible conclusions
   */
  private detectImplicitContradictions(
    thoughts1: ThoughtData[],
    thoughts2: ThoughtData[]
  ): ContradictionPoint[] {
    const conclusions1 = this.extractConclusions(thoughts1);
    const conclusions2 = this.extractConclusions(thoughts2);
    
    return this.findContradictingPairs(conclusions1, conclusions2, 'implicit');
  }

  /**
   * Detect contradictions in assumptions
   */
  private detectAssumptionContradictions(
    thoughts1: ThoughtData[],
    thoughts2: ThoughtData[]
  ): ContradictionPoint[] {
    const assumptions1 = this.extractAssumptions(thoughts1);
    const assumptions2 = this.extractAssumptions(thoughts2);
    
    return this.findContradictingPairs(
      assumptions1.map(a => `Assumes: ${a}`),
      assumptions2.map(a => `Assumes: ${a}`),
      'assumption'
    );
  }

  /**
   * Find contradicting pairs between two sets of texts
   */
  private findContradictingPairs(
    texts1: string[],
    texts2: string[],
    type: ContradictionPoint['type']
  ): ContradictionPoint[] {
    const contradictions: ContradictionPoint[] = [];

    for (const t1 of texts1) {
      const contradictingT2 = this.findContradictingText(t1, texts2);
      if (contradictingT2) {
        contradictions.push({
          thought1: t1,
          thought2: contradictingT2,
          type
        });
      }
    }

    return contradictions;
  }

  /**
   * Find a contradicting text in a list
   */
  private findContradictingText(text: string, candidates: string[]): string | null {
    for (const candidate of candidates) {
      if (this.hasDirectContradiction(text, candidate)) {
        return candidate;
      }
    }
    return null;
  }

  /**
   * Create all pairs of thoughts for comparison
   */
  private createThoughtPairs(
    thoughts1: ThoughtData[],
    thoughts2: ThoughtData[]
  ): Array<[ThoughtData, ThoughtData]> {
    const pairs: Array<[ThoughtData, ThoughtData]> = [];
    
    for (const t1 of thoughts1) {
      for (const t2 of thoughts2) {
        pairs.push([t1, t2]);
      }
    }
    
    return pairs;
  }

  /**
   * Extract conclusions from thoughts
   */
  private extractConclusions(thoughts: ThoughtData[]): string[] {
    const patterns = [
      /therefore (.+?)(?:\.|$)/gi,
      /thus (.+?)(?:\.|$)/gi,
      /conclude that (.+?)(?:\.|$)/gi,
      /this (?:means|implies|suggests) (.+?)(?:\.|$)/gi
    ];

    return this.extractByPatterns(thoughts, patterns);
  }

  /**
   * Extract assumptions from thoughts
   */
  private extractAssumptions(thoughts: ThoughtData[]): string[] {
    const patterns = [
      /assuming (.+?)(?:\.|,|$)/gi,
      /given that (.+?)(?:\.|,|$)/gi,
      /if we accept (.+?)(?:\.|,|$)/gi
    ];

    return this.extractByPatterns(thoughts, patterns);
  }

  /**
   * Extract text matching patterns
   */
  private extractByPatterns(thoughts: ThoughtData[], patterns: RegExp[]): string[] {
    const results: string[] = [];

    for (const thought of thoughts) {
      const thoughtMatches = this.extractPatternMatchesFromText(thought.content, patterns);
      results.push(...thoughtMatches);
    }

    return results;
  }

  /**
   * Extract pattern matches from a single text
   */
  private extractPatternMatchesFromText(text: string, patterns: RegExp[]): string[] {
    const matches: string[] = [];

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const patternMatches = this.getAllMatches(text, pattern);
      matches.push(...patternMatches);
    }

    return matches;
  }

  /**
   * Get all matches for a pattern in text
   */
  private getAllMatches(text: string, pattern: RegExp): string[] {
    const matches: string[] = [];
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        matches.push(match[1]);
      }
    }
    
    return matches;
  }
}

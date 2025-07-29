/**
 * Gap Pattern Matcher
 * Handles pattern matching for knowledge gap detection
 */

import { KnowledgeGap } from '../knowledgeGapDetector.js';

export interface PatternMatch {
  content: string;
  gapType: KnowledgeGap['gapType'];
  matchedText: string;
  startIndex: number;
  endIndex: number;
}

export class GapPatternMatcher {
  private readonly patterns = new Map<KnowledgeGap['gapType'], RegExp[]>([
    ['factual', [
      /I(?:'m| am) not sure (?:about |if |whether )?(.+?)(?:\.|,|;|$)/gi,
      /(?:need to |should |must )(?:find out|research|check|verify) (.+?)(?:\.|,|;|$)/gi,
      /(?:unclear|unknown|uncertain) (?:what|how|why|when|where) (.+?)(?:\.|,|;|$)/gi,
      /(?:don't|do not) know (?:the |if |whether |how )?(.+?)(?:\.|,|;|$)/gi
    ]],
    ['temporal', [
      /(?:recent|latest|current|up-to-date|2024|2025) (.+?)(?:\.|,|;|$)/gi,
      /(?:after|since|as of) (?:January 2025|my knowledge cutoff)/gi,
      /(?:has|have) (?:recently |just )?(?:been |changed|updated)/gi
    ]],
    ['causal', [
      /(?:causes?|reasons?|why) (?:of |for )?(.+?) (?:is|are|unclear|unknown)/gi,
      /(?:leads? to|results? in|causes?) (.+?) but (?:unclear|not sure) why/gi
    ]],
    ['comparative', [
      /(?:compared to|versus|vs\.?|relative to) (.+?) (?:unclear|unknown|need data)/gi,
      /(?:better|worse|more|less) than (.+?) but (?:need|lack) (?:data|information)/gi
    ]],
    ['technical', [
      /(?:technical details|specifications|implementation) (?:of |for )?(.+?) (?:unclear|needed)/gi,
      /(?:how to|steps to|process for) (.+?) (?:unknown|unclear|needed)/gi
    ]]
  ]);

  /**
   * Find all pattern matches in content
   */
  findMatches(content: string): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (const [gapType, typePatterns] of this.patterns) {
      const typeMatches = this.findMatchesForType(content, gapType, typePatterns);
      matches.push(...typeMatches);
    }

    // Add question detection
    const questionMatches = this.findQuestions(content);
    matches.push(...questionMatches);

    return matches;
  }

  /**
   * Find matches for a specific gap type
   */
  private findMatchesForType(
    content: string, 
    gapType: KnowledgeGap['gapType'], 
    patterns: RegExp[]
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (const pattern of patterns) {
      const patternMatches = this.extractPatternMatches(content, pattern, gapType);
      matches.push(...patternMatches);
    }

    return matches;
  }

  /**
   * Extract all matches for a single pattern
   */
  private extractPatternMatches(
    content: string,
    pattern: RegExp,
    gapType: KnowledgeGap['gapType']
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];
    pattern.lastIndex = 0; // Reset regex state
    
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const patternMatch = this.createPatternMatch(match, gapType);
      matches.push(patternMatch);
    }

    return matches;
  }

  /**
   * Create a pattern match object from regex match
   */
  private createPatternMatch(
    match: RegExpExecArray,
    gapType: KnowledgeGap['gapType']
  ): PatternMatch {
    return {
      content: match[1] || match[0],
      gapType,
      matchedText: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    };
  }

  /**
   * Find explicit questions in content
   */
  private findQuestions(content: string): PatternMatch[] {
    const questionPattern = /(?:^|\. )(?:What|How|Why|When|Where|Who|Which) .+?\?/g;
    return this.extractPatternMatches(content, questionPattern, 'factual');
  }

  /**
   * Get patterns for a specific gap type
   */
  getPatternsForType(gapType: KnowledgeGap['gapType']): RegExp[] {
    return this.patterns.get(gapType) || [];
  }
}

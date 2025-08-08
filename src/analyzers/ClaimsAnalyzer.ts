/**
 * Claims Analyzer
 * Analyzes thoughts for claims and their support status
 */

import { ThoughtData } from '../types.js';

export interface ClaimAnalysis {
  claim: string;
  thoughtId: string;
  isSupported: boolean;
  supportType?: 'source' | 'citation' | 'reference';
}

export class ClaimsAnalyzer {
  private readonly claimPatterns = [
    /(?:studies show|research indicates|data suggests) (.+?)(?:\.|,|;|$)/gi,
    /(?:it is|this is|that is) (?:proven|established|known) that (.+?)(?:\.|,|;|$)/gi,
    /(?:statistics|numbers|figures) (?:show|indicate|reveal) (.+?)(?:\.|,|;|$)/gi
  ];

  private readonly supportIndicators = [
    'source:',
    'according to',
    'citation:',
    'reference:',
    'based on',
    'as reported by'
  ];

  /**
   * Analyze thoughts for claims and their support
   */
  analyzeClaims(thoughts: ThoughtData[]): ClaimAnalysis[] {
    const allClaims = this.extractAllClaims(thoughts);
    const supportedClaims = this.identifySupportedClaims(thoughts, allClaims);
    
    return allClaims.map(claim => ({
      ...claim,
      isSupported: supportedClaims.has(claim.claim)
    }));
  }

  /**
   * Extract all claims from thoughts
   */
  private extractAllClaims(thoughts: ThoughtData[]): Omit<ClaimAnalysis, 'isSupported'>[] {
    const claims: Omit<ClaimAnalysis, 'isSupported'>[] = [];

    for (const thought of thoughts) {
      const thoughtClaims = this.extractClaimsFromText(thought.content, thought.id);
      claims.push(...thoughtClaims);
    }

    return claims;
  }

  /**
   * Extract claims from a single text
   */
  private extractClaimsFromText(text: string, thoughtId: string): Omit<ClaimAnalysis, 'isSupported'>[] {
    const claims: Omit<ClaimAnalysis, 'isSupported'>[] = [];

    for (const pattern of this.claimPatterns) {
      const matches = this.findPatternMatches(text, pattern);
      const thoughtClaims = matches.map(match => ({
        claim: match.trim(),
        thoughtId
      }));
      claims.push(...thoughtClaims);
    }

    return claims;
  }

  /**
   * Find all matches for a pattern in text
   */
  private findPatternMatches(text: string, pattern: RegExp): string[] {
    const matches: string[] = [];
    pattern.lastIndex = 0; // Reset regex
    
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        matches.push(match[1]);
      }
    }
    
    return matches;
  }

  /**
   * Identify which claims have supporting evidence
   */
  private identifySupportedClaims(
    thoughts: ThoughtData[], 
    claims: Omit<ClaimAnalysis, 'isSupported'>[]
  ): Set<string> {
    const supported = new Set<string>();

    for (const claim of claims) {
      if (this.hasSupport(thoughts, claim.claim)) {
        supported.add(claim.claim);
      }
    }

    return supported;
  }

  /**
   * Check if a claim has supporting evidence
   */
  private hasSupport(thoughts: ThoughtData[], claim: string): boolean {
    const claimLower = claim.toLowerCase();

    for (const thought of thoughts) {
      if (this.thoughtSupportsClaim(thought, claimLower)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a specific thought supports a claim
   */
  private thoughtSupportsClaim(thought: ThoughtData, claimLower: string): boolean {
    const contentLower = thought.content.toLowerCase();
    
    // Early return if thought doesn't contain the claim
    if (!contentLower.includes(claimLower)) {
      return false;
    }

    // Check if thought has support indicators
    return this.hasSupportIndicators(contentLower);
  }

  /**
   * Check if text contains support indicators
   */
  private hasSupportIndicators(text: string): boolean {
    return this.supportIndicators.some(indicator => 
      text.includes(indicator.toLowerCase())
    );
  }

  /**
   * Get unsupported claims
   */
  getUnsupportedClaims(thoughts: ThoughtData[]): ClaimAnalysis[] {
    return this.analyzeClaims(thoughts).filter(claim => !claim.isSupported);
  }
}

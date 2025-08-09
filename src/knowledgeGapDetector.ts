/**
 * Knowledge Gap Detector
 * Identifies missing information in branches and suggests queries
 */

import { BranchGraph } from './branchGraph.js';
import { BranchNode, ThoughtData } from './types.js';
import { GapPatternMatcher } from './analyzers/GapPatternMatcher.js';
import { ClaimsAnalyzer } from './analyzers/ClaimsAnalyzer.js';
import { GapQueryGenerator } from './analyzers/GapQueryGenerator.js';
import { TopicExtractor } from './analyzers/TopicExtractor.js';
import { GapMatch } from './types/interfaces.js';

export interface KnowledgeGap {
  branchId: string;
  thoughtId?: string;
  gapType: 'factual' | 'temporal' | 'causal' | 'comparative' | 'technical';
  description: string;
  suggestedQuery: string;
  confidence: number;
  autoSearch: boolean;
}

export class KnowledgeGapDetector {
  private readonly patternMatcher = new GapPatternMatcher();
  private readonly claimsAnalyzer = new ClaimsAnalyzer();
  private readonly queryGenerator = new GapQueryGenerator();
  private readonly topicExtractor = new TopicExtractor();

  /**
   * Detect knowledge gaps in a branch
   */
  async detectGaps(graph: BranchGraph, branchId: string): Promise<KnowledgeGap[]> {
    const branch = graph.getBranch(branchId);
    if (!branch) {
      throw new Error(`Branch ${branchId} not found`);
    }

    const thoughts = this.getBranchThoughts(graph, branch);
    
    // Collect all gaps
    const patternGaps = this.detectPatternGaps(thoughts, branchId);
    const claimGaps = this.detectClaimGaps(thoughts, branchId);
    const temporalGaps = this.detectTemporalGaps(thoughts, branchId);

    // Combine and prioritize
    const allGaps = [...patternGaps, ...claimGaps, ...temporalGaps];
    return this.prioritizeGaps(allGaps);
  }

  /**
   * Detect gaps using pattern matching
   */
  private detectPatternGaps(thoughts: ThoughtData[], branchId: string): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];

    for (const thought of thoughts) {
      const matches = this.patternMatcher.findMatches(thought.content);
      
      const thoughtGaps = matches.map(match => this.createGapFromMatch(
        match,
        thought,
        branchId
      ));
      
      gaps.push(...thoughtGaps);
    }

    return gaps;
  }

  /**
   * Create gap from pattern match
   */
  private createGapFromMatch(match: GapMatch, thought: ThoughtData, branchId: string): KnowledgeGap {
    const isQuestion = match.matchedText.includes('?');
    
    return {
      branchId,
      thoughtId: thought.id,
      gapType: match.gapType,
      description: isQuestion ? 
        `Unanswered question: ${match.content}` : 
        `Missing ${match.gapType} information: ${match.content}`,
      suggestedQuery: isQuestion ?
        this.queryGenerator.generateFromQuestion(match.content) :
        this.queryGenerator.generateQuery(match.content, match.gapType),
      confidence: this.calculateConfidence(match, thought.content),
      autoSearch: this.shouldAutoSearch(match.gapType, thought.content, isQuestion)
    };
  }

  /**
   * Detect unsupported claims
   */
  private detectClaimGaps(thoughts: ThoughtData[], branchId: string): KnowledgeGap[] {
    const unsupportedClaims = this.claimsAnalyzer.getUnsupportedClaims(thoughts);
    
    return unsupportedClaims.map(claim => ({
      branchId,
      thoughtId: claim.thoughtId,
      gapType: 'factual' as const,
      description: `Unsupported claim needs evidence: ${claim.claim}`,
      suggestedQuery: this.queryGenerator.generateForClaim(claim.claim),
      confidence: 0.7,
      autoSearch: true
    }));
  }

  /**
   * Detect temporal relevance gaps
   */
  private detectTemporalGaps(thoughts: ThoughtData[], branchId: string): KnowledgeGap[] {
    const hasTemporalClaims = thoughts.some(t => 
      /current|latest|recent|today|now|2024|2025/.test(t.content)
    );
    
    if (!hasTemporalClaims) {
      return [];
    }

    const mainTopic = this.topicExtractor.extractMainTopic(thoughts);
    
    return [{
      branchId,
      gapType: 'temporal' as const,
      description: 'Branch contains time-sensitive claims that may need updating',
      suggestedQuery: this.queryGenerator.generateTemporalQuery(mainTopic),
      confidence: 0.8,
      autoSearch: true
    }];
  }

  /**
   * Calculate confidence in gap detection
   */
  private calculateConfidence(match: GapMatch, content: string): number {
    let confidence = 0.6; // Base confidence

    // Questions have high confidence
    if (match.matchedText.includes('?')) {
      return 0.95;
    }

    // Explicit uncertainty markers
    if (/not sure|unclear|unknown|don't know/i.test(content)) {
      confidence += 0.2;
    }

    // Temporal gaps after knowledge cutoff
    if (match.gapType === 'temporal' && /2025|recent|latest/i.test(content)) {
      confidence = Math.max(confidence, 0.9);
    }

    return Math.min(confidence, 0.95);
  }

  /**
   * Determine if gap should trigger auto search
   */
  private shouldAutoSearch(
    gapType: KnowledgeGap['gapType'], 
    content: string,
    isQuestion: boolean
  ): boolean {
    // Always search for temporal gaps and questions
    if (gapType === 'temporal' || isQuestion) {
      return true;
    }

    // Search for high urgency
    return /must (?:find out|research|check)|urgently need/i.test(content);
  }

  /**
   * Prioritize and deduplicate gaps
   */
  private prioritizeGaps(gaps: KnowledgeGap[]): KnowledgeGap[] {
    // Sort by auto-search priority and confidence
    const sorted = gaps.sort((a, b) => {
      if (a.autoSearch !== b.autoSearch) {
        return a.autoSearch ? -1 : 1;
      }
      return b.confidence - a.confidence;
    });

    // Deduplicate
    return this.deduplicateGaps(sorted).slice(0, 5);
  }

  /**
   * Remove duplicate gaps
   */
  private deduplicateGaps(gaps: KnowledgeGap[]): KnowledgeGap[] {
    const seen = new Set<string>();
    const unique: KnowledgeGap[] = [];

    for (const gap of gaps) {
      const key = `${gap.gapType}-${gap.suggestedQuery.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(gap);
      }
    }

    return unique;
  }

  /**
   * Get thoughts for a branch
   */
  private getBranchThoughts(graph: BranchGraph, branch: BranchNode): ThoughtData[] {
    return branch.thoughtIds
      .map(id => graph.getThought(id))
      .filter((t): t is ThoughtData => t !== undefined);
  }
}

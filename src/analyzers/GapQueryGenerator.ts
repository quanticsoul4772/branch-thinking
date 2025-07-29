/**
 * Gap Query Generator
 * Generates search queries for knowledge gaps
 */

import { KnowledgeGap } from '../knowledgeGapDetector.js';

export class GapQueryGenerator {
  /**
   * Generate search query for a gap
   */
  generateQuery(gapContent: string, gapType: KnowledgeGap['gapType']): string {
    const cleanedContent = this.cleanContent(gapContent);
    return this.addContextByType(cleanedContent, gapType);
  }

  /**
   * Clean up gap content
   */
  private cleanContent(content: string): string {
    return content
      .replace(/(?:is|are|was|were|unclear|unknown|uncertain|needed?)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Add context based on gap type
   */
  private addContextByType(query: string, gapType: KnowledgeGap['gapType']): string {
    const contextMap: Record<KnowledgeGap['gapType'], (q: string) => string> = {
      temporal: (q) => `latest ${q} 2025`,
      causal: (q) => `why ${q} causes reasons`,
      comparative: (q) => `${q} comparison analysis`,
      technical: (q) => `how to ${q} technical details`,
      factual: (q) => q // No additional context for factual
    };

    return contextMap[gapType](query);
  }

  /**
   * Generate query from question
   */
  generateFromQuestion(question: string): string {
    return question.trim().replace('?', '');
  }

  /**
   * Generate query for unsupported claim
   */
  generateForClaim(claim: string): string {
    return `evidence for ${claim}`;
  }

  /**
   * Generate temporal update query
   */
  generateTemporalQuery(topic: string): string {
    return `latest updates ${topic}`;
  }
}

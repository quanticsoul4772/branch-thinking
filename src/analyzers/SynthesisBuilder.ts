/**
 * Synthesis Builder
 * Builds synthesis branches with proper structure
 */

import { BranchNode } from '../types.js';
import { ResolutionType } from './ResolutionGenerator.js';

export class SynthesisBuilder {
  /**
   * Generate synthesis branch ID
   */
  generateBranchId(branch1Id: string, branch2Id: string): string {
    return `synthesis-${branch1Id}-${branch2Id}-${Date.now()}`;
  }

  /**
   * Generate synthesis introduction
   */
  generateIntroduction(
    branch1: BranchNode,
    branch2: BranchNode,
    resolutionType: ResolutionType
  ): string {
    const description = this.getResolutionDescription(resolutionType);
    
    return `DIALECTICAL SYNTHESIS: This branch synthesizes the contradictory perspectives from branches "${branch1.id}" and "${branch2.id}" by ${description}. The goal is not to choose one over the other, but to find a more complete understanding that encompasses both views.`;
  }

  /**
   * Generate integrated conclusion
   */
  generateConclusion(resolutionType: ResolutionType): string {
    return `SYNTHESIS COMPLETE: Through ${resolutionType} resolution, we have integrated the insights from both branches into a more comprehensive understanding. This synthesis preserves the valuable insights from each perspective while transcending their limitations. The result is a more nuanced and complete view that can guide future reasoning.`;
  }

  /**
   * Calculate synthesis confidence
   */
  calculateSynthesisConfidence(
    branch1: BranchNode,
    branch2: BranchNode,
    resolutionType: ResolutionType
  ): number {
    const baseConfidence = this.getBaseConfidence(resolutionType);
    const avgBranchConfidence = (branch1.confidence + branch2.confidence) / 2;
    return baseConfidence * avgBranchConfidence;
  }

  /**
   * Calculate contradiction confidence
   */
  calculateContradictionConfidence(
    contradictionPoints: Array<{type: 'direct' | 'implicit' | 'assumption'}>
  ): number {
    const weights = {
      direct: 0.9,
      implicit: 0.7,
      assumption: 0.6
    };

    const totalWeight = contradictionPoints.reduce((sum, p) => sum + weights[p.type], 0);
    return Math.min(totalWeight / contradictionPoints.length, 0.95);
  }

  /**
   * Get resolution type description
   */
  private getResolutionDescription(type: ResolutionType): string {
    const descriptions: Record<ResolutionType, string> = {
      'integration': 'integrating partial truths from both perspectives',
      'contextualization': 'recognizing different contexts where each view applies',
      'higher-order': 'transcending the contradiction through a higher-level understanding',
      'temporal': 'resolving through temporal sequencing and evolution'
    };

    return descriptions[type];
  }

  /**
   * Get base confidence for resolution type
   */
  private getBaseConfidence(type: ResolutionType): number {
    const confidences: Record<ResolutionType, number> = {
      'integration': 0.8,
      'contextualization': 0.85,
      'higher-order': 0.75,
      'temporal': 0.8
    };

    return confidences[type];
  }
}

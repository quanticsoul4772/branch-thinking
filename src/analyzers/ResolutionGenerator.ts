/**
 * Resolution Generator
 * Generates resolution thoughts for different synthesis types
 */

import { ContradictionPoint } from './ContradictionDetector.js';

export interface ResolutionThought {
  content: string;
  confidence: number;
  keyPoints: string[];
}

export type ResolutionType = 'integration' | 'contextualization' | 'higher-order' | 'temporal';

export class ResolutionGenerator {
  /**
   * Generate resolutions based on type
   */
  generateResolutions(
    contradictionPoints: ContradictionPoint[],
    resolutionType: ResolutionType
  ): ResolutionThought[] {
    const generator = this.getGeneratorForType(resolutionType);
    return generator(contradictionPoints);
  }

  /**
   * Get the appropriate generator function
   */
  private getGeneratorForType(
    type: ResolutionType
  ): (points: ContradictionPoint[]) => ResolutionThought[] {
    const generators: Record<ResolutionType, (points: ContradictionPoint[]) => ResolutionThought[]> = {
      integration: (points) => this.generateIntegrationResolutions(points),
      contextualization: (points) => this.generateContextualizationResolutions(points),
      'higher-order': (points) => this.generateHigherOrderResolutions(points),
      temporal: (points) => this.generateTemporalResolutions(points)
    };

    return generators[type];
  }

  /**
   * Generate integration resolutions
   */
  private generateIntegrationResolutions(
    points: ContradictionPoint[]
  ): ResolutionThought[] {
    return points.map(point => ({
      content: this.formatIntegrationResolution(point),
      confidence: 0.8,
      keyPoints: ['partial truth', 'spectrum thinking', 'complementary aspects']
    }));
  }

  /**
   * Generate contextualization resolutions
   */
  private generateContextualizationResolutions(
    points: ContradictionPoint[]
  ): ResolutionThought[] {
    return points.map(point => ({
      content: this.formatContextualizationResolution(point),
      confidence: 0.85,
      keyPoints: ['context-dependent', 'conditional truth', 'situational validity']
    }));
  }

  /**
   * Generate higher-order resolutions
   */
  private generateHigherOrderResolutions(
    _points: ContradictionPoint[]
  ): ResolutionThought[] {
    return [{
      content: this.formatHigherOrderResolution(),
      confidence: 0.75,
      keyPoints: ['transcendent principle', 'conceptual limitation', 'meta-level understanding']
    }];
  }

  /**
   * Generate temporal resolutions
   */
  private generateTemporalResolutions(
    _points: ContradictionPoint[]
  ): ResolutionThought[] {
    return [{
      content: this.formatTemporalResolution(),
      confidence: 0.8,
      keyPoints: ['temporal evolution', 'sequential truth', 'dynamic resolution']
    }];
  }

  /**
   * Format integration resolution content
   */
  private formatIntegrationResolution(point: ContradictionPoint): string {
    const thought1Preview = this.truncateThought(point.thought1);
    const thought2Preview = this.truncateThought(point.thought2);

    return `INTEGRATION: Both perspectives contain partial truths. "${thought1Preview}..." and "${thought2Preview}..." can be integrated by recognizing that the truth lies in a spectrum rather than binary opposition. The synthesis acknowledges both aspects as complementary rather than contradictory.`;
  }

  /**
   * Format contextualization resolution content
   */
  private formatContextualizationResolution(point: ContradictionPoint): string {
    const thought1Preview = this.truncateThought(point.thought1);
    const thought2Preview = this.truncateThought(point.thought2);

    return `CONTEXTUALIZATION: The apparent contradiction dissolves when we recognize different contexts. "${thought1Preview}..." applies in certain conditions, while "${thought2Preview}..." is true under different circumstances. The key is identifying when each perspective is most applicable.`;
  }

  /**
   * Format higher-order resolution content
   */
  private formatHigherOrderResolution(): string {
    return 'HIGHER-ORDER SYNTHESIS: The contradiction reveals a limitation in our current conceptual framework. By shifting to a higher level of abstraction, we can see that both perspectives are manifestations of a more fundamental principle that encompasses and transcends the apparent opposition.';
  }

  /**
   * Format temporal resolution content
   */
  private formatTemporalResolution(): string {
    return 'TEMPORAL RESOLUTION: The contradiction is resolved through temporal sequencing. What appears contradictory when viewed simultaneously makes sense as a progression over time. The first perspective may be true initially, evolving into the second perspective as conditions change.';
  }

  /**
   * Truncate thought for preview
   */
  private truncateThought(thought: string): string {
    const maxLength = 50;
    const cleaned = thought.replace(/^Assumes: /, '');
    return cleaned.length > maxLength 
      ? cleaned.slice(0, maxLength)
      : cleaned;
  }

  /**
   * Determine resolution type based on contradiction characteristics
   */
  determineResolutionType(contradictionPoints: ContradictionPoint[]): ResolutionType {
    // Check assumption contradictions
    const assumptionCount = contradictionPoints.filter(p => p.type === 'assumption').length;
    if (assumptionCount > contradictionPoints.length / 2) {
      return 'contextualization';
    }

    // Check for temporal conflicts
    const hasTemporalConflict = contradictionPoints.some(p =>
      /when|time|before|after|during|now|then|future|past/.test(p.thought1 + p.thought2)
    );
    if (hasTemporalConflict) {
      return 'temporal';
    }

    // Check for degree conflicts
    const hasDegreeConflict = contradictionPoints.some(p =>
      /more|less|partial|complete|some|all/.test(p.thought1 + p.thought2)
    );
    if (hasDegreeConflict) {
      return 'integration';
    }

    // Default to higher-order
    return 'higher-order';
  }
}

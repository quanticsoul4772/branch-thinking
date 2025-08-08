/**
 * Semantic Flow Analyzer
 * Analyzes semantic continuity and clustering in thought sequences
 */

import { ThoughtData } from '../types.js';
import { EmbeddingManager } from './EmbeddingManager.js';

export interface DriftPoint {
  index: number;
  drift: number;
  thought: string;
}

export interface SemanticCluster {
  start: number;
  end: number;
  theme: string;
}

export interface FlowAnalysis {
  continuityScore: number;
  driftPoints: DriftPoint[];
  semanticClusters: SemanticCluster[];
}

export class SemanticFlowAnalyzer {
  private embeddingManager = new EmbeddingManager();

  private readonly stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are',
    'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'to',
    'of', 'in', 'for', 'with', 'by', 'from', 'about', 'into', 'through'
  ]);

  /**
   * Analyze semantic flow in a sequence of thoughts
   */
  async analyzeFlow(thoughts: ThoughtData[]): Promise<FlowAnalysis> {
    if (thoughts.length < 2) {
      return {
        continuityScore: 1.0,
        driftPoints: [],
        semanticClusters: []
      };
    }

    // Get embeddings for all thoughts
    const embeddings = await this.getThoughtEmbeddings(thoughts);

    // Analyze continuity
    const continuityAnalysis = this.analyzeContinuity(thoughts, embeddings);

    // Identify clusters
    const semanticClusters = this.identifyClusters(thoughts, embeddings);

    return {
      continuityScore: continuityAnalysis.score,
      driftPoints: continuityAnalysis.driftPoints,
      semanticClusters
    };
  }

  /**
   * Get embeddings for thoughts
   */
  private async getThoughtEmbeddings(thoughts: ThoughtData[]): Promise<Float32Array[]> {
    const thoughtData = thoughts.map(t => ({ id: t.id, content: t.content }));
    const embeddingMap = await this.embeddingManager.getEmbeddings(thoughtData);
    
    const embeddings: Float32Array[] = [];
    for (const t of thoughts) {
      const embedding = embeddingMap.get(t.id);
      if (!embedding) {
        // Skip thoughts without embeddings to allow partial analysis
        continue;
      }
      embeddings.push(embedding);
    }
    return embeddings;
  }

  /**
   * Analyze continuity between consecutive thoughts
   */
  private analyzeContinuity(
    thoughts: ThoughtData[],
    embeddings: Float32Array[]
  ): { score: number; driftPoints: DriftPoint[] } {
    let totalContinuity = 0;
    const driftPoints: DriftPoint[] = [];

    for (let i = 1; i < embeddings.length; i++) {
      const prevEmbedding = embeddings[i - 1];
      const currEmbedding = embeddings[i];
      
      if (!prevEmbedding || !currEmbedding) {
        continue; // Skip if embeddings are missing
      }
      
      const similarity = this.embeddingManager.calculateSimilarity(
        prevEmbedding,
        currEmbedding
      );
      
      totalContinuity += similarity;

      const drift = 1 - similarity;
      const thought = thoughts[i];
      if (drift > 0.5 && thought) {
        driftPoints.push({
          index: i,
          drift,
          thought: this.truncateThought(thought.content)
        });
      }
    }

    const score = totalContinuity / (embeddings.length - 1);
    return { score, driftPoints };
  }

  /**
   * Identify semantic clusters
   */
  private identifyClusters(
    thoughts: ThoughtData[],
    embeddings: Float32Array[]
  ): SemanticCluster[] {
    const clusters: SemanticCluster[] = [];
    let clusterStart = 0;

    for (let i = 1; i < embeddings.length; i++) {
      const isNewCluster = this.isNewCluster(embeddings, clusterStart, i);
      const isLastThought = i === embeddings.length - 1;

      if (!isNewCluster && !isLastThought) {
        continue;
      }

      const clusterEnd = isNewCluster ? i - 1 : i;
      const cluster = this.createCluster(thoughts, clusterStart, clusterEnd);
      
      if (cluster) {
        clusters.push(cluster);
      }

      if (isNewCluster) {
        clusterStart = i;
      }
    }

    return clusters;
  }

  /**
   * Check if current thought starts a new cluster
   */
  private isNewCluster(embeddings: Float32Array[], clusterStart: number, currentIndex: number): boolean {
    const clusterStartEmbedding = embeddings[clusterStart];
    const currentEmbedding = embeddings[currentIndex];
    
    if (!clusterStartEmbedding || !currentEmbedding) {
      throw new Error(`Missing embedding at index ${clusterStart} or ${currentIndex}`);
    }
    
    const similarity = this.embeddingManager.calculateSimilarity(
      clusterStartEmbedding,
      currentEmbedding
    );
    return similarity < 0.6;
  }

  /**
   * Create a semantic cluster if valid
   */
  private createCluster(
    thoughts: ThoughtData[], 
    start: number, 
    end: number
  ): SemanticCluster | null {
    if (end - start <= 0) {
      return null;
    }

    const clusterThoughts = thoughts.slice(start, end + 1);
    const theme = this.extractClusterTheme(clusterThoughts);

    return { start, end, theme };
  }

  /**
   * Extract theme from cluster thoughts
   */
  private extractClusterTheme(thoughts: ThoughtData[]): string {
    const wordFreq = this.calculateWordFrequencies(thoughts);
    const topWords = this.getTopWords(wordFreq, 3);
    return topWords.join(', ');
  }

  /**
   * Calculate word frequencies from thoughts
   */
  private calculateWordFrequencies(thoughts: ThoughtData[]): Map<string, number> {
    const wordFreq = new Map<string, number>();

    for (const thought of thoughts) {
      const words = this.extractMeaningfulWords(thought.content);
      this.updateWordFrequencies(wordFreq, words);
    }

    return wordFreq;
  }

  /**
   * Update word frequency map
   */
  private updateWordFrequencies(wordFreq: Map<string, number>, words: string[]): void {
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }

  /**
   * Get top N words by frequency
   */
  private getTopWords(wordFreq: Map<string, number>, count: number): string[] {
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([word]) => word);
  }

  /**
   * Extract meaningful words from text
   */
  private extractMeaningfulWords(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3 && !this.stopWords.has(w));
  }

  /**
   * Truncate thought for display
   */
  private truncateThought(content: string, maxLength: number = 100): string {
    return content.length > maxLength 
      ? content.substring(0, maxLength) + '...'
      : content;
  }
}

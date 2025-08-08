/**
 * Embedding Manager
 * Manages embedding retrieval and caching
 */

import { semanticSimilarity } from '../semanticSimilarity.js';
import { semanticProfileManager } from '../semanticProfile.js';

export class EmbeddingManager {
  /**
   * Get embedding for a thought, using cache if available
   */
  getEmbedding(thoughtId: string, content: string): Promise<Float32Array> {
    // Try cache first
    const cached = semanticProfileManager.getCachedEmbedding(thoughtId);
    if (cached) {
      return Promise.resolve(cached);
    }

    // Calculate if not cached
    return semanticSimilarity.getEmbedding(content);
  }

  /**
   * Get embeddings for multiple thoughts
   */
  async getEmbeddings(
    thoughts: Array<{ id: string; content: string }>
  ): Promise<Map<string, Float32Array>> {
    const embeddings = new Map<string, Float32Array>();

    for (const thought of thoughts) {
      const embedding = await this.getEmbedding(thought.id, thought.content);
      embeddings.set(thought.id, embedding);
    }

    return embeddings;
  }

  /**
   * Calculate similarity between two embeddings
   */
  calculateSimilarity(embedding1: Float32Array, embedding2: Float32Array): number {
    return semanticSimilarity.cosineSimilarity(embedding1, embedding2);
  }

  /**
   * Find most similar embedding from a set
   */
  findMostSimilar(
    targetEmbedding: Float32Array,
    candidateEmbeddings: Map<string, Float32Array>,
    excludeIds?: Set<string>
  ): { id: string; similarity: number } | null {
    let bestId: string | null = null;
    let bestSimilarity = -1;

    for (const [id, embedding] of candidateEmbeddings) {
      if (excludeIds?.has(id)) {
        continue;
      }

      const similarity = this.calculateSimilarity(targetEmbedding, embedding);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestId = id;
      }
    }

    return bestId ? { id: bestId, similarity: bestSimilarity } : null;
  }
}

/**
 * Semantic similarity implementation using embeddings
 * Replaces simple word overlap with meaning-based comparison
 */

import { pipeline, env } from '@xenova/transformers';
import { getConfig } from './config.js';

// Configure transformers.js to suppress ALL output
env.allowLocalModels = false;
env.useBrowserCache = false;
env.allowRemoteModels = true;
// Use type assertion for additional properties
(env as any).remoteURL = 'https://huggingface.co/';
(env as any).localURL = '';
// Disable all progress and logging
(env as any).noProgress = true;
(env as any).silent = true;

export class SemanticSimilarityService {
  private static instance: SemanticSimilarityService | null = null;
  private embedder: any = null;
  private modelName = 'Xenova/all-MiniLM-L6-v2';
  private embeddings: Map<string, Float32Array> = new Map();
  private initialized = false;
  
  private constructor() {}
  
  static getInstance(): SemanticSimilarityService {
    if (!this.instance) {
      this.instance = new SemanticSimilarityService();
    }
    return this.instance;
  }
  
  /**
   * Initialize the embedding model
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      // Silently initialize the model with all output suppressed
      this.embedder = await pipeline('feature-extraction', this.modelName, {
        progress_callback: () => {}, // Empty callback to suppress progress
        // Additional options to suppress output
        quantized: false,
        revision: 'main'
      } as any);
      this.initialized = true;
    } catch (error) {
      // Log to logger instead of console
      // Failed to initialize semantic similarity model
      throw error;
    }
  }
  
  /**
   * Generate embedding for a text
   */
  async getEmbedding(text: string): Promise<Float32Array> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Check cache first
    const cacheKey = this.getCacheKey(text);
    if (this.embeddings.has(cacheKey)) {
      return this.embeddings.get(cacheKey)!;
    }
    
    try {
      // Generate embedding
      const output = await this.embedder(text, { 
        pooling: 'mean',
        normalize: true 
      });
      
      // Convert to Float32Array
      const embedding = new Float32Array(output.data);
      
      // Cache the result
      this.embeddings.set(cacheKey, embedding);
      
      // Manage cache size
      if (this.embeddings.size > 1000) {
        // Remove oldest entries
        const keysToDelete = Array.from(this.embeddings.keys()).slice(0, 100);
        keysToDelete.forEach(key => this.embeddings.delete(key));
      }
      
      return embedding;
    } catch (error) {
      // Failed to generate embedding
      throw error;
    }
  }
  
  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(vec1: Float32Array, vec2: Float32Array): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
    }
    
    // Since embeddings are normalized, dot product is cosine similarity
    return dotProduct;
  }
  
  /**
   * Calculate semantic similarity between two texts
   */
  async calculateSimilarity(text1: string, text2: string): Promise<number> {
    const [embedding1, embedding2] = await Promise.all([
      this.getEmbedding(text1),
      this.getEmbedding(text2)
    ]);
    
    return this.cosineSimilarity(embedding1, embedding2);
  }
  
  /**
   * Batch calculate similarities between multiple texts
   */
  async calculateBatchSimilarities(texts: string[]): Promise<number[][]> {
    // Get all embeddings
    const embeddings = await Promise.all(
      texts.map(text => this.getEmbedding(text))
    );
    
    // Calculate pairwise similarities
    const similarities: number[][] = [];
    for (let i = 0; i < embeddings.length; i++) {
      similarities[i] = [];
      for (let j = 0; j < embeddings.length; j++) {
        if (i === j) {
          similarities[i][j] = 1.0;
        } else {
          similarities[i][j] = this.cosineSimilarity(embeddings[i], embeddings[j]);
        }
      }
    }
    
    return similarities;
  }
  
  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.embeddings.clear();
  }
  
  /**
   * Get cache key for a text
   */
  private getCacheKey(text: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `${hash}_${text.length}`;
  }
  
  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const semanticSimilarity = SemanticSimilarityService.getInstance();

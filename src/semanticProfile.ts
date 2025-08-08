/**
 * Phase 3: Branch Semantic Profiles
 * Tracks semantic centers of branches for overlap detection
 */

import { BranchNode, ThoughtData } from './types.js';
import { semanticSimilarity } from './semanticSimilarity.js';

/**
 * Helper class for keyword extraction using TF-IDF
 */
class KeywordExtractor {
  private static readonly STOP_WORDS = new Set([
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are',
    'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'to',
    'of', 'in', 'for', 'with', 'by', 'from', 'about', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out',
    'off', 'over', 'under', 'again', 'further', 'then', 'once', 'that',
    'this', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'them', 'their', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
    'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    'can', 'just', 'but', 'if', 'or', 'because', 'until', 'while'
  ]);

  static extractKeywords(documents: string[], topN: number = 10): string[] {
    const tokenizedDocs = documents.map(doc => KeywordExtractor.tokenize(doc));
    const tfidfScores = KeywordExtractor.calculateTFIDFScores(tokenizedDocs);
    
    return Array.from(tfidfScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([word]) => word);
  }

  private static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 2 &&
        !KeywordExtractor.STOP_WORDS.has(word) &&
        !/^\d+$/.test(word)
      );
  }

  private static calculateTFIDFScores(tokenizedDocs: string[][]): Map<string, number> {
    const documentFrequency = KeywordExtractor.calculateDocumentFrequency(tokenizedDocs);
    const tfidfScores = new Map<string, number>();
    const totalDocs = tokenizedDocs.length;
    
    for (const tokens of tokenizedDocs) {
      const termFrequency = KeywordExtractor.calculateTermFrequency(tokens);
      const totalTerms = tokens.length;
      
      for (const [token, tf] of termFrequency) {
        const df = documentFrequency.get(token) || 0;
        const idf = Math.log(totalDocs / (1 + df));
        const tfidf = (tf / totalTerms) * idf;
        
        tfidfScores.set(token, (tfidfScores.get(token) || 0) + tfidf);
      }
    }
    
    return tfidfScores;
  }

  private static calculateDocumentFrequency(tokenizedDocs: string[][]): Map<string, number> {
    const documentFrequency = new Map<string, number>();
    
    for (const tokens of tokenizedDocs) {
      const uniqueTokens = new Set(tokens);
      for (const token of uniqueTokens) {
        documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
      }
    }
    
    return documentFrequency;
  }

  private static calculateTermFrequency(tokens: string[]): Map<string, number> {
    const termFrequency = new Map<string, number>();
    
    for (const token of tokens) {
      termFrequency.set(token, (termFrequency.get(token) || 0) + 1);
    }
    
    return termFrequency;
  }
}

/**
 * Helper class for branch similarity calculations
 */
class BranchSimilarityCalculator {
  static calculateSimilarity(branch1: BranchNode, branch2: BranchNode): number {
    if (!branch1.semanticProfile || !branch2.semanticProfile) {
      return 0;
    }
    
    return semanticSimilarity.cosineSimilarity(
      branch1.semanticProfile.centerEmbedding,
      branch2.semanticProfile.centerEmbedding
    );
  }

  static generateOverlapMatrix(branches: BranchNode[]): Map<string, Map<string, number>> {
    const matrix = new Map<string, Map<string, number>>();
    
    for (const branch1 of branches) {
      if (!branch1.semanticProfile) {
        continue;
      }
      
      const row = new Map<string, number>();
      matrix.set(branch1.id, row);
      
      for (const branch2 of branches) {
        if (!branch2.semanticProfile) {
          continue;
        }
        
        const similarity = branch1.id === branch2.id 
          ? 1.0 
          : BranchSimilarityCalculator.calculateSimilarity(branch1, branch2);
        
        row.set(branch2.id, similarity);
      }
    }
    
    return matrix;
  }

  static findSharedKeywords(branch1: BranchNode, branch2: BranchNode): string[] {
    if (!branch1.semanticProfile || !branch2.semanticProfile) {
      return [];
    }
    
    const keywords1 = new Set(branch1.semanticProfile.keywords);
    const keywords2 = new Set(branch2.semanticProfile.keywords);
    
    return Array.from(keywords1).filter(k => keywords2.has(k));
  }
}

export class SemanticProfileManager {
  private embeddingCache: Map<string, Float32Array> = new Map();
  
  /**
   * Update branch semantic profile with a new thought
   * Uses running average to update center embedding efficiently
   */
  async updateBranchProfile(
    branch: BranchNode, 
    thoughtContent: string,
    thoughtId: string
  ): Promise<void> {
    if (!branch) {
      console.error('updateBranchProfile called with undefined branch');
      return;
    }
    
    const thoughtEmbedding = await semanticSimilarity.getEmbedding(thoughtContent);
    this.embeddingCache.set(thoughtId, thoughtEmbedding);
    
    if (!branch.semanticProfile) {
      this.initializeBranchProfile(branch, thoughtEmbedding);
    } else {
      this.updateBranchEmbedding(branch, thoughtEmbedding);
    }
    
    await this.updateKeywords(branch);
  }

  private initializeBranchProfile(branch: BranchNode, embedding: Float32Array): void {
    branch.semanticProfile = {
      centerEmbedding: new Float32Array(embedding),
      keywords: [],
      thoughtCount: 1,
      lastUpdated: new Date()
    };
  }

  private updateBranchEmbedding(branch: BranchNode, newEmbedding: Float32Array): void {
    const profile = branch.semanticProfile;
    if (!profile) {
      throw new Error('Branch semantic profile not found');
    }
    const n = profile.thoughtCount;
    
    // Calculate new average: avg_new = (avg_old * n + new_value) / (n + 1)
    for (let i = 0; i < profile.centerEmbedding.length; i++) {
      profile.centerEmbedding[i] = 
        (profile.centerEmbedding[i] * n + newEmbedding[i]) / (n + 1);
    }
    
    profile.thoughtCount = n + 1;
    profile.lastUpdated = new Date();
  }
  
  /**
   * Calculate similarity between a thought and a branch's semantic center
   */
  async calculateThoughtToBranchSimilarity(
    thoughtContent: string,
    branch: BranchNode
  ): Promise<number> {
    if (!branch.semanticProfile) {
      return 0;
    }
    
    const thoughtEmbedding = await semanticSimilarity.getEmbedding(thoughtContent);
    return semanticSimilarity.cosineSimilarity(
      thoughtEmbedding,
      branch.semanticProfile.centerEmbedding
    );
  }
  
  /**
   * Find the most similar branch to a given thought
   */
  async findMostSimilarBranch(
    thoughtContent: string,
    branches: BranchNode[],
    excludeBranchId?: string
  ): Promise<{ branch: BranchNode | null; similarity: number }> {
    let maxSimilarity = -1;
    let mostSimilarBranch: BranchNode | null = null;
    
    const eligibleBranches = branches.filter(
      b => b.id !== excludeBranchId && b.semanticProfile
    );
    
    for (const branch of eligibleBranches) {
      const similarity = await this.calculateThoughtToBranchSimilarity(
        thoughtContent,
        branch
      );
      
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        mostSimilarBranch = branch;
      }
    }
    
    return { branch: mostSimilarBranch, similarity: maxSimilarity };
  }
  
  /**
   * Calculate similarity between two branches
   */
  calculateBranchSimilarity(branch1: BranchNode, branch2: BranchNode): number {
    return BranchSimilarityCalculator.calculateSimilarity(branch1, branch2);
  }
  
  /**
   * Generate overlap matrix for all branches
   */
  generateOverlapMatrix(branches: BranchNode[]): Map<string, Map<string, number>> {
    return BranchSimilarityCalculator.generateOverlapMatrix(branches);
  }
  
  /**
   * Update keywords for a branch using TF-IDF
   */
  private async updateKeywords(branch: BranchNode): Promise<void> {
    if (!branch.semanticProfile || branch.thoughts.length === 0) {
      return;
    }
    
    const documents = branch.thoughts.map(thought => thought.content);
    branch.semanticProfile.keywords = KeywordExtractor.extractKeywords(documents, 10);
  }
  
  /**
   * Get cached embedding for a thought
   */
  getCachedEmbedding(thoughtId: string): Float32Array | undefined {
    return this.embeddingCache.get(thoughtId);
  }
  
  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
  }
  
  /**
   * Detect semantic drift within a branch
   * Returns drift score (0-1) indicating how much the branch has drifted from its center
   */
  async detectSemanticDrift(branch: BranchNode): Promise<number> {
    if (!branch.semanticProfile || branch.thoughts.length < 3) {
      return 0;
    }
    
    const recentThoughts = branch.thoughts.slice(-5);
    const driftScores = await Promise.all(
      recentThoughts.map(async thought => {
        const similarity = await this.calculateThoughtToBranchSimilarity(
          thought.content,
          branch
        );
        return 1 - similarity;
      })
    );
    
    return driftScores.reduce((sum, drift) => sum + drift, 0) / driftScores.length;
  }
  
  /**
   * Suggest branches that could be merged based on high similarity
   */
  suggestMerges(branches: BranchNode[], threshold: number = 0.85): Array<{
    branch1: BranchNode;
    branch2: BranchNode;
    similarity: number;
    sharedKeywords: string[];
  }> {
    const suggestions = [];
    
    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        const branch1 = branches[i];
        const branch2 = branches[j];
        
        if (!branch1.semanticProfile || !branch2.semanticProfile) {
          continue;
        }
        
        const similarity = this.calculateBranchSimilarity(branch1, branch2);
        
        if (similarity >= threshold) {
          const sharedKeywords = BranchSimilarityCalculator.findSharedKeywords(branch1, branch2);
          
          suggestions.push({
            branch1,
            branch2,
            similarity,
            sharedKeywords
          });
        }
      }
    }
    
    return suggestions.sort((a, b) => b.similarity - a.similarity);
  }
  
  /**
   * Get visualization data for semantic overlap
   */
  getVisualizationData(branches: BranchNode[]): {
    nodes: Array<{ id: string; label: string; keywords: string[] }>;
    edges: Array<{ source: string; target: string; weight: number }>;
  } {
    const nodes = branches
      .filter(b => b.semanticProfile)
      .map(branch => ({
        id: branch.id,
        label: branch.description || `Branch ${branch.id}`,
        keywords: branch.semanticProfile!.keywords.slice(0, 5)
      }));
    
    const edges = this.buildVisualizationEdges(branches);
    
    return { nodes, edges };
  }

  private buildVisualizationEdges(branches: BranchNode[]): Array<{ source: string; target: string; weight: number }> {
    const edges: Array<{ source: string; target: string; weight: number }> = [];
    const matrix = this.generateOverlapMatrix(branches);
    
    for (const [source, targets] of matrix) {
      for (const [target, weight] of targets) {
        if (source < target && weight > 0.3) {
          edges.push({ source, target, weight });
        }
      }
    }
    
    return edges;
  }
}

// Export singleton instance
export const semanticProfileManager = new SemanticProfileManager();

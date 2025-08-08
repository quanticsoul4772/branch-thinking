/**
 * Stage 4: Semantic Navigation
 * Helps navigate reasoning by finding semantically related thoughts across all branches
 */

import { BranchGraph } from './branchGraph.js';
import { ThoughtData, BranchNode } from './types.js';
import { semanticSimilarity } from './semanticSimilarity.js';
import { semanticProfileManager } from './semanticProfile.js';

export interface SimilarThought {
  thoughtId: string;
  content: string;
  branchId: string;
  branchDescription?: string;
  similarity: number;
  type: string;
  timestamp: Date;
}

export interface RelatedThought extends SimilarThought {
  relationship: 'same-branch' | 'cross-branch' | 'parent-branch' | 'child-branch';
}

export interface SemanticPathNode {
  thoughtId: string;
  content: string;
  branchId: string;
  similarity: number;
  cumulativeDistance: number;
}

export class SemanticNavigator {
  /**
   * Find thoughts similar to a query across all branches
   */
  async findSimilar(
    graph: BranchGraph,
    query: string,
    limit: number = 10
  ): Promise<SimilarThought[]> {
    const queryEmbedding = await semanticSimilarity.getEmbedding(query);
    
    // Process all branches in parallel with error handling
    const branchPromises = graph.getAllBranches().map(branch =>
      this.findSimilarInBranch(graph, branch, queryEmbedding).catch(error => {
        console.warn(`Failed to process branch ${branch.id}:`, error);
        return [];
      })
    );
    
    const branchResults = await Promise.all(branchPromises);
    const results = branchResults.flat();
    
    // Sort by similarity and return top results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }
  
  /**
   * Find similar thoughts within a single branch
   */
  private async findSimilarInBranch(
    graph: BranchGraph,
    branch: BranchNode,
    queryEmbedding: Float32Array
  ): Promise<SimilarThought[]> {
    // Get thoughts from this branch
    const thoughts = this.getBranchThoughts(graph, branch);
    
    // Process all thoughts in parallel
    const thoughtPromises = thoughts.map(thought =>
      this.createSimilarThought(thought, branch, queryEmbedding)
    );
    
    return Promise.all(thoughtPromises);
  }
  
  /**
   * Get thoughts from a branch
   */
  private getBranchThoughts(graph: BranchGraph, branch: BranchNode): ThoughtData[] {
    return branch.thoughtIds
      .map(id => graph.getThought(id))
      .filter((t): t is ThoughtData => t !== undefined);
  }
  
  /**
   * Create a SimilarThought object
   */
  private async createSimilarThought(
    thought: ThoughtData,
    branch: BranchNode,
    queryEmbedding: Float32Array
  ): Promise<SimilarThought> {
    const similarity = await this.calculateThoughtSimilarity(thought, queryEmbedding);
    
    return {
      thoughtId: thought.id,
      content: thought.content,
      branchId: branch.id,
      branchDescription: branch.description,
      similarity,
      type: thought.metadata.type,
      timestamp: thought.timestamp
    };
  }
  
  /**
   * Calculate similarity between a thought and query embedding
   */
  private async calculateThoughtSimilarity(
    thought: ThoughtData,
    queryEmbedding: Float32Array
  ): Promise<number> {
    // Try to get cached embedding first
    let thoughtEmbedding = semanticProfileManager.getCachedEmbedding(thought.id);
    
    if (!thoughtEmbedding) {
      // Calculate if not cached
      thoughtEmbedding = await semanticSimilarity.getEmbedding(thought.content);
    }
    
    return semanticSimilarity.cosineSimilarity(queryEmbedding, thoughtEmbedding);
  }
  
  /**
   * Find thoughts related to a specific thought
   */
  async jumpToRelated(
    graph: BranchGraph,
    thoughtId: string,
    limit: number = 5
  ): Promise<RelatedThought[]> {
    const thought = graph.getThought(thoughtId);
    if (!thought) {
      throw new Error(`Thought ${thoughtId} not found`);
    }
    
    // Find which branch contains this thought
    const sourceBranchId = (graph as any).thoughtToBranch.get(thoughtId) || thought.branchId;
    const sourceBranch = graph.getBranch(sourceBranchId);
    
    // Get embedding for the source thought
    const sourceEmbedding = await this.getThoughtEmbedding(thought);
    
    // Process all branches in parallel
    const branchPromises = graph.getAllBranches().map(branch =>
      this.findRelatedInBranch(
        graph,
        branch,
        thoughtId,
        sourceEmbedding,
        sourceBranchId,
        sourceBranch
      )
    );
    
    const branchResults = await Promise.all(branchPromises);
    const results = branchResults.flat();
    
    // Sort by similarity, but prioritize same-branch slightly
    return this.sortRelatedThoughts(results, limit);
  }
  
  /**
   * Find related thoughts within a single branch
   */
  private async findRelatedInBranch(
    graph: BranchGraph,
    branch: BranchNode,
    excludeThoughtId: string,
    sourceEmbedding: Float32Array,
    sourceBranchId: string,
    sourceBranch: BranchNode | undefined
  ): Promise<RelatedThought[]> {
    const thoughts = this.getFilteredThoughts(graph, branch, excludeThoughtId);
    
    // Process all thoughts in parallel
    const thoughtPromises = thoughts.map(relatedThought =>
      this.createRelatedThought(
        relatedThought,
        branch,
        sourceEmbedding,
        sourceBranchId,
        sourceBranch?.parentId
      )
    );
    
    return Promise.all(thoughtPromises);
  }
  
  /**
   * Get filtered thoughts from a branch
   */
  private getFilteredThoughts(
    graph: BranchGraph,
    branch: BranchNode,
    excludeThoughtId: string
  ): ThoughtData[] {
    return branch.thoughtIds
      .map(id => graph.getThought(id))
      .filter((t): t is ThoughtData => t !== undefined && t.id !== excludeThoughtId);
  }
  
  /**
   * Create a RelatedThought object
   */
  private async createRelatedThought(
    thought: ThoughtData,
    branch: BranchNode,
    sourceEmbedding: Float32Array,
    sourceBranchId: string,
    sourceParentId: string | undefined
  ): Promise<RelatedThought> {
    const thoughtEmbedding = await this.getThoughtEmbedding(thought);
    const similarity = semanticSimilarity.cosineSimilarity(sourceEmbedding, thoughtEmbedding);
    
    // Determine relationship type
    const relationship = this.determineRelationship(
      branch.id,
      sourceBranchId,
      branch.parentId,
      sourceParentId
    );
    
    return {
      thoughtId: thought.id,
      content: thought.content,
      branchId: branch.id,
      branchDescription: branch.description,
      similarity,
      type: thought.metadata.type,
      timestamp: thought.timestamp,
      relationship
    };
  }
  
  /**
   * Determine relationship between branches
   */
  private determineRelationship(
    branchId: string,
    sourceBranchId: string,
    branchParentId: string | undefined,
    sourceParentId: string | undefined
  ): RelatedThought['relationship'] {
    if (branchId === sourceBranchId) {
      return 'same-branch';
    }
    if (branchParentId === sourceBranchId) {
      return 'child-branch';
    }
    if (sourceParentId === branchId) {
      return 'parent-branch';
    }
    return 'cross-branch';
  }
  
  /**
   * Sort related thoughts with same-branch boost
   */
  private sortRelatedThoughts(
    results: RelatedThought[],
    limit: number
  ): RelatedThought[] {
    return results
      .sort((a, b) => {
        // Give a small boost to same-branch thoughts
        const aScore = a.similarity + (a.relationship === 'same-branch' ? 0.05 : 0);
        const bScore = b.similarity + (b.relationship === 'same-branch' ? 0.05 : 0);
        return bScore - aScore;
      })
      .slice(0, limit);
  }
  
  /**
   * Get thought embedding with caching
   */
  private async getThoughtEmbedding(thought: ThoughtData): Promise<Float32Array> {
    let embedding = semanticProfileManager.getCachedEmbedding(thought.id);
    if (!embedding) {
      embedding = await semanticSimilarity.getEmbedding(thought.content);
    }
    return embedding;
  }
  
  /**
   * Find semantic path between two thoughts
   */
  async findSemanticPath(
    graph: BranchGraph,
    fromThoughtId: string,
    toThoughtId: string,
    maxSteps: number = 5
  ): Promise<SemanticPathNode[]> {
    const fromThought = graph.getThought(fromThoughtId);
    const toThought = graph.getThought(toThoughtId);
    
    if (!fromThought || !toThought) {
      throw new Error('Both thoughts must exist');
    }
    
    // Get embeddings
    const fromEmbedding = await this.getThoughtEmbedding(fromThought);
    const toEmbedding = await this.getThoughtEmbedding(toThought);
    
    // Initialize path
    const path = this.initializePath(fromThought, graph);
    const visited = new Set<string>([fromThoughtId]);
    
    // Build path
    await this.buildSemanticPath(
      graph,
      path,
      visited,
      toThoughtId,
      toEmbedding,
      fromEmbedding,
      maxSteps
    );
    
    return path;
  }
  
  /**
   * Initialize path with starting node
   */
  private initializePath(thought: ThoughtData, graph: BranchGraph): SemanticPathNode[] {
    return [{
      thoughtId: thought.id,
      content: thought.content,
      branchId: (graph as any).thoughtToBranch.get(thought.id) || thought.branchId,
      similarity: 1.0,
      cumulativeDistance: 0
    }];
  }
  
  /**
   * Build semantic path step by step
   */
  private async buildSemanticPath(
    graph: BranchGraph,
    path: SemanticPathNode[],
    visited: Set<string>,
    targetId: string,
    targetEmbedding: Float32Array,
    startEmbedding: Float32Array,
    maxSteps: number
  ): Promise<void> {
    let currentEmbedding = startEmbedding;
    let cumulativeDistance = 0;
    
    for (let step = 0; step < maxSteps; step++) {
      if (this.isPathComplete(path, targetId)) {
        break;
      }
      
      const result = await this.expandPath(
        graph,
        path,
        visited,
        currentEmbedding,
        targetEmbedding,
        cumulativeDistance
      );
      
      if (!result) {
        break;
      }
      
      currentEmbedding = result.embedding;
      cumulativeDistance = result.distance;
      
      if (result.thoughtId === targetId) {
        break;
      }
    }
  }
  
  /**
   * Check if path is complete
   */
  private isPathComplete(path: SemanticPathNode[], targetId: string): boolean {
    return path[path.length - 1].thoughtId === targetId;
  }
  
  /**
   * Expand path with next best node
   */
  private async expandPath(
    graph: BranchGraph,
    path: SemanticPathNode[],
    visited: Set<string>,
    currentEmbedding: Float32Array,
    targetEmbedding: Float32Array,
    cumulativeDistance: number
  ): Promise<{ thoughtId: string; embedding: Float32Array; distance: number } | null> {
    const nextNode = await this.findBestNextNode(
      graph,
      visited,
      currentEmbedding,
      targetEmbedding,
      cumulativeDistance
    );
    
    if (!nextNode || nextNode.similarity <= path[path.length - 1].similarity - 0.1) {
      // No progress or going backwards too much
      return null;
    }
    
    path.push(nextNode);
    visited.add(nextNode.thoughtId);
    
    // Get embedding for next iteration
    const nextThought = graph.getThought(nextNode.thoughtId);
    if (!nextThought) {
      // Skip this node and let caller continue searching
      return null;
    }
    const nextEmbedding = await this.getThoughtEmbedding(nextThought);
    
    return {
      thoughtId: nextNode.thoughtId,
      embedding: nextEmbedding,
      distance: nextNode.cumulativeDistance
    };
  }
  
  /**
   * Find best next node in path
   */
  private async findBestNextNode(
    graph: BranchGraph,
    visited: Set<string>,
    currentEmbedding: Float32Array,
    targetEmbedding: Float32Array,
    cumulativeDistance: number
  ): Promise<SemanticPathNode | null> {
    let bestNext: SemanticPathNode | null = null;
    let bestScore = -1;
    
    for (const branch of graph.getAllBranches()) {
      const candidate = await this.findBestNodeInBranch(
        graph,
        branch,
        visited,
        currentEmbedding,
        targetEmbedding,
        cumulativeDistance
      );
      
      if (candidate && candidate.score > bestScore) {
        bestScore = candidate.score;
        bestNext = candidate.node;
      }
    }
    
    return bestNext;
  }
  
  /**
   * Find best node in a specific branch
   */
  private async findBestNodeInBranch(
    graph: BranchGraph,
    branch: BranchNode,
    visited: Set<string>,
    currentEmbedding: Float32Array,
    targetEmbedding: Float32Array,
    cumulativeDistance: number
  ): Promise<{ node: SemanticPathNode; score: number } | null> {
    let best: { node: SemanticPathNode; score: number } | null = null;
    
    const thoughts = this.getUnvisitedThoughts(graph, branch, visited);
    
    for (const thought of thoughts) {
      const candidate = await this.evaluateThoughtAsCandidate(
        thought,
        branch,
        currentEmbedding,
        targetEmbedding,
        cumulativeDistance
      );
      
      if (!best || candidate.score > best.score) {
        best = candidate;
      }
    }
    
    return best;
  }
  
  /**
   * Get unvisited thoughts from branch
   */
  private getUnvisitedThoughts(
    graph: BranchGraph,
    branch: BranchNode,
    visited: Set<string>
  ): ThoughtData[] {
    return branch.thoughtIds
      .map(id => graph.getThought(id))
      .filter((t): t is ThoughtData => t !== undefined && !visited.has(t.id));
  }
  
  /**
   * Evaluate a thought as a path candidate
   */
  private async evaluateThoughtAsCandidate(
    thought: ThoughtData,
    branch: BranchNode,
    currentEmbedding: Float32Array,
    targetEmbedding: Float32Array,
    cumulativeDistance: number
  ): Promise<{ node: SemanticPathNode; score: number }> {
    const thoughtEmbedding = await this.getThoughtEmbedding(thought);
    
    // Calculate similarity to target
    const similarityToTarget = semanticSimilarity.cosineSimilarity(thoughtEmbedding, targetEmbedding);
    
    // Calculate similarity to current position (for path smoothness)
    const similarityToCurrent = semanticSimilarity.cosineSimilarity(thoughtEmbedding, currentEmbedding);
    
    // Combined score favoring progress toward target but maintaining some continuity
    const score = 0.7 * similarityToTarget + 0.3 * similarityToCurrent;
    
    const stepDistance = 1 - similarityToCurrent;
    const node: SemanticPathNode = {
      thoughtId: thought.id,
      content: thought.content,
      branchId: branch.id,
      similarity: similarityToTarget,
      cumulativeDistance: cumulativeDistance + stepDistance
    };
    
    return { node, score };
  }
  
  /**
   * Analyze semantic flow in a branch
   */
  async analyzeSemanticFlow(
    graph: BranchGraph,
    branchId: string
  ): Promise<{
    continuityScore: number;
    driftPoints: Array<{ index: number; drift: number; thought: string }>;
    semanticClusters: Array<{ start: number; end: number; theme: string }>;
  }> {
    const branch = graph.getBranch(branchId);
    if (!branch || branch.thoughts.length < 2) {
      return {
        continuityScore: 1.0,
        driftPoints: [],
        semanticClusters: []
      };
    }
    
    const thoughts = branch.thoughts;
    const embeddings = await this.getAllEmbeddings(thoughts);
    
    // Calculate continuity
    const { continuityScore, driftPoints } = this.calculateContinuity(thoughts, embeddings);
    
    // Identify clusters
    const semanticClusters = this.identifySemanticClusters(thoughts, embeddings);
    
    return {
      continuityScore,
      driftPoints,
      semanticClusters
    };
  }
  
  /**
   * Get all embeddings for thoughts
   */
  private async getAllEmbeddings(thoughts: ThoughtData[]): Promise<Float32Array[]> {
    // Process all thoughts in parallel
    const embeddingPromises = thoughts.map(thought =>
      this.getThoughtEmbedding(thought)
    );
    
    return Promise.all(embeddingPromises);
  }
  
  /**
   * Calculate continuity score and drift points
   */
  private calculateContinuity(
    thoughts: ThoughtData[],
    embeddings: Float32Array[]
  ): { continuityScore: number; driftPoints: Array<{ index: number; drift: number; thought: string }> } {
    let totalContinuity = 0;
    const driftPoints: Array<{ index: number; drift: number; thought: string }> = [];
    
    for (let i = 1; i < embeddings.length; i++) {
      const prevEmbedding = embeddings[i - 1];
      const currEmbedding = embeddings[i];
      
      if (!prevEmbedding || !currEmbedding) {
        throw new Error(`Missing embedding at index ${i - 1} or ${i}`);
      }
      
      const similarity = semanticSimilarity.cosineSimilarity(prevEmbedding, currEmbedding);
      totalContinuity += similarity;
      
      const drift = 1 - similarity;
      if (drift > 0.5) { // Significant drift
        driftPoints.push({
          index: i,
          drift,
          thought: thoughts[i].content.substring(0, 100) + '...'
        });
      }
    }
    
    const continuityScore = totalContinuity / (embeddings.length - 1);
    return { continuityScore, driftPoints };
  }
  
  /**
   * Identify semantic clusters in thoughts
   */
  private identifySemanticClusters(
    thoughts: ThoughtData[],
    embeddings: Float32Array[]
  ): Array<{ start: number; end: number; theme: string }> {
    const semanticClusters: Array<{ start: number; end: number; theme: string }> = [];
    let clusterStart = 0;
    
    for (let i = 1; i < embeddings.length; i++) {
      const shouldEndCluster = this.shouldEndCluster(embeddings, clusterStart, i);
      
      if (shouldEndCluster) {
        this.addClusterIfValid(thoughts, semanticClusters, clusterStart, i - 1);
        clusterStart = i;
      }
    }
    
    // Handle last cluster
    if (clusterStart < embeddings.length - 1) {
      this.addClusterIfValid(thoughts, semanticClusters, clusterStart, embeddings.length - 1);
    }
    
    return semanticClusters;
  }
  
  /**
   * Check if we should end the current cluster
   */
  private shouldEndCluster(
    embeddings: Float32Array[],
    clusterStart: number,
    currentIndex: number
  ): boolean {
    const clusterStartEmbedding = embeddings[clusterStart];
    const currentEmbedding = embeddings[currentIndex];
    
    if (!clusterStartEmbedding || !currentEmbedding) {
      throw new Error(`Missing embedding at index ${clusterStart} or ${currentIndex}`);
    }
    
    const similarity = semanticSimilarity.cosineSimilarity(
      clusterStartEmbedding,
      currentEmbedding
    );
    
    return similarity < 0.6 || currentIndex === embeddings.length - 1;
  }
  
  /**
   * Add cluster if valid
   */
  private addClusterIfValid(
    thoughts: ThoughtData[],
    clusters: Array<{ start: number; end: number; theme: string }>,
    start: number,
    end: number
  ): void {
    const cluster = this.createCluster(thoughts, start, end);
    if (cluster) {
      clusters.push(cluster);
    }
  }
  
  /**
   * Create a cluster from thoughts
   */
  private createCluster(
    thoughts: ThoughtData[],
    start: number,
    end: number
  ): { start: number; end: number; theme: string } | null {
    if (end - start < 1) {
      return null;
    }
    
    const clusterThoughts = thoughts.slice(start, end + 1);
    const theme = this.extractClusterTheme(clusterThoughts);
    
    return { start, end, theme };
  }
  
  /**
   * Extract theme from a cluster of thoughts
   */
  private extractClusterTheme(thoughts: ThoughtData[]): string {
    // Simple approach: find most common meaningful words
    const wordFreq = new Map<string, number>();
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are',
      'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'to',
      'of', 'in', 'for', 'with', 'by', 'from', 'about', 'into', 'through'
    ]);
    
    for (const thought of thoughts) {
      const words = this.extractMeaningfulWords(thought.content, stopWords);
      for (const word of words) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }
    
    // Get top 3 words
    const topWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
    
    return topWords.join(', ');
  }
  
  /**
   * Extract meaningful words from text
   */
  private extractMeaningfulWords(text: string, stopWords: Set<string>): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));
  }
}

// Export singleton instance
export const semanticNavigator = new SemanticNavigator();

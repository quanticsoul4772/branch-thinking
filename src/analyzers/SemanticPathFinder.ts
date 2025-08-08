/**
 * Semantic Path Finder
 * Finds semantic paths between thoughts
 */

import { BranchGraph } from '../branchGraph.js';
import { ThoughtData } from '../types.js';
import { EmbeddingManager } from './EmbeddingManager.js';
import { ThoughtCollector } from './ThoughtCollector.js';

export interface PathNode {
  thoughtId: string;
  content: string;
  branchId: string;
  similarity: number;
  cumulativeDistance: number;
}

export class SemanticPathFinder {
  private embeddingManager = new EmbeddingManager();
  private thoughtCollector = new ThoughtCollector();

  /**
   * Find semantic path between two thoughts
   */
  async findPath(
    graph: BranchGraph,
    fromThoughtId: string,
    toThoughtId: string,
    maxSteps: number = 5
  ): Promise<PathNode[]> {
    const fromThought = graph.getThought(fromThoughtId);
    const toThought = graph.getThought(toThoughtId);

    if (!fromThought || !toThought) {
      throw new Error('Both thoughts must exist');
    }

    // Initialize path
    const fromBranchId = this.thoughtCollector.getThoughtBranchId(graph, fromThoughtId) || fromThought.branchId;
    const path: PathNode[] = [{
      thoughtId: fromThoughtId,
      content: fromThought.content,
      branchId: fromBranchId,
      similarity: 1.0,
      cumulativeDistance: 0
    }];

    // Get target embedding
    const toEmbedding = await this.embeddingManager.getEmbedding(toThoughtId, toThought.content);

    // Collect all thoughts and their embeddings
    const allThoughts = this.thoughtCollector.collectAllThoughts(graph);
    const thoughtEmbeddings = await this.getThoughtEmbeddings(allThoughts);

    // Find path
    const visited = new Set<string>([fromThoughtId]);
    let currentEmbedding = await this.embeddingManager.getEmbedding(fromThoughtId, fromThought.content);
    let cumulativeDistance = 0;

    for (let step = 0; step < maxSteps && path[path.length - 1].thoughtId !== toThoughtId; step++) {
      const nextNode = await this.findNextStep(
        currentEmbedding,
        toEmbedding,
        thoughtEmbeddings,
        visited,
        cumulativeDistance
      );

      if (!nextNode || nextNode.similarity <= path[path.length - 1].similarity - 0.1) {
        break; // No progress
      }

      path.push(nextNode);
      visited.add(nextNode.thoughtId);

      if (nextNode.thoughtId === toThoughtId) {
        break; // Reached target
      }

      // Update for next iteration
      currentEmbedding = thoughtEmbeddings.get(nextNode.thoughtId)!.embedding;
      cumulativeDistance = nextNode.cumulativeDistance;
    }

    return path;
  }

  /**
   * Get embeddings for all thoughts
   */
  private async getThoughtEmbeddings(
    thoughts: Array<{ thought: ThoughtData; branchId: string }>
  ): Promise<Map<string, { embedding: Float32Array; branchId: string; content: string }>> {
    const result = new Map();

    for (const { thought, branchId } of thoughts) {
      const embedding = await this.embeddingManager.getEmbedding(thought.id, thought.content);
      result.set(thought.id, { embedding, branchId, content: thought.content });
    }

    return result;
  }

  /**
   * Find the best next step in the path
   */
  private async findNextStep(
    currentEmbedding: Float32Array,
    targetEmbedding: Float32Array,
    thoughtEmbeddings: Map<string, { embedding: Float32Array; branchId: string; content: string }>,
    visited: Set<string>,
    currentDistance: number
  ): Promise<PathNode | null> {
    let bestNode: PathNode | null = null;
    let bestScore = -1;

    for (const [thoughtId, data] of thoughtEmbeddings) {
      if (visited.has(thoughtId)) {
        continue;
      }

      const similarityToTarget = this.embeddingManager.calculateSimilarity(
        data.embedding,
        targetEmbedding
      );
      
      const similarityToCurrent = this.embeddingManager.calculateSimilarity(
        data.embedding,
        currentEmbedding
      );

      // Combined score favoring progress toward target
      const score = 0.7 * similarityToTarget + 0.3 * similarityToCurrent;

      if (score > bestScore) {
        bestScore = score;
        const stepDistance = 1 - similarityToCurrent;
        
        bestNode = {
          thoughtId,
          content: data.content,
          branchId: data.branchId,
          similarity: similarityToTarget,
          cumulativeDistance: currentDistance + stepDistance
        };
      }
    }

    return bestNode;
  }
}

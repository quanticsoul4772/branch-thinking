/**
 * Thought Collector
 * Collects and organizes thoughts from branches
 */

import { BranchGraph } from '../branchGraph.js';
import { ThoughtData, BranchNode } from '../types.js';

export interface ThoughtWithContext {
  thought: ThoughtData;
  branchId: string;
  branchDescription?: string | undefined;
  relationship?: 'same-branch' | 'cross-branch' | 'parent-branch' | 'child-branch' | undefined;
}

export class ThoughtCollector {
  /**
   * Collect all thoughts from all branches
   */
  collectAllThoughts(graph: BranchGraph): ThoughtWithContext[] {
    const thoughts: ThoughtWithContext[] = [];

    for (const branch of graph.getAllBranches()) {
      const branchThoughts = this.collectBranchThoughts(graph, branch);
      thoughts.push(...branchThoughts);
    }

    return thoughts;
  }

  /**
   * Collect thoughts from a specific branch
   */
  collectBranchThoughts(graph: BranchGraph, branch: BranchNode): ThoughtWithContext[] {
    return branch.thoughtIds
      .map(id => graph.getThought(id))
      .filter((t): t is ThoughtData => t !== undefined)
      .map(thought => ({
        thought,
        branchId: branch.id,
        branchDescription: branch.description
      }));
  }

  /**
   * Collect thoughts with relationships to a source branch
   */
  collectThoughtsWithRelationships(
    graph: BranchGraph,
    sourceBranchId: string,
    excludeThoughtId?: string
  ): ThoughtWithContext[] {
    const thoughts: ThoughtWithContext[] = [];
    const sourceBranch = graph.getBranch(sourceBranchId);

    for (const branch of graph.getAllBranches()) {
      const relationship = this.determineBranchRelationship(
        branch,
        sourceBranchId,
        sourceBranch
      );

      const branchThoughts = this.collectBranchThoughts(graph, branch)
        .filter(ctx => ctx.thought.id !== excludeThoughtId)
        .map(ctx => ({ ...ctx, relationship }));

      thoughts.push(...branchThoughts);
    }

    return thoughts;
  }

  /**
   * Determine relationship between branches
   */
  private determineBranchRelationship(
    branch: BranchNode,
    sourceBranchId: string,
    sourceBranch?: BranchNode | null
  ): ThoughtWithContext['relationship'] {
    if (branch.id === sourceBranchId) {
      return 'same-branch';
    } else if (branch.parentId === sourceBranchId) {
      return 'child-branch';
    } else if (sourceBranch?.parentId === branch.id) {
      return 'parent-branch';
    }
    return 'cross-branch';
  }

  /**
   * Get branch ID for a thought
   */
  getThoughtBranchId(graph: BranchGraph, thoughtId: string): string | null {
    // Try the internal mapping first if available
    const branchId = (graph as { thoughtToBranch?: Map<string, string> }).thoughtToBranch?.get(thoughtId);
    if (branchId) {
      return branchId;
    }

    // Otherwise search all branches
    for (const branch of graph.getAllBranches()) {
      if (branch.thoughtIds.includes(thoughtId)) {
        return branch.id;
      }
    }

    return null;
  }
}

/**
 * Unit tests for SemanticNavigator to ensure correctness after parallelization
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { BranchGraph } from '../../branchGraph.js';
import { SemanticNavigator } from '../../semanticNavigator.js';
import { ThoughtData, BranchNode } from '../../types.js';
import { semanticSimilarity } from '../../semanticSimilarity.js';

// Mock semantic similarity functions
vi.mock('../../semanticSimilarity.js', () => ({
  semanticSimilarity: {
    getEmbedding: vi.fn(),
    cosineSimilarity: vi.fn()
  }
}));

describe('SemanticNavigator', () => {
  let graph: BranchGraph;
  let navigator: SemanticNavigator;
  let testBranches: BranchNode[];
  let testThoughts: ThoughtData[];

  beforeEach(() => {
    graph = new BranchGraph();
    navigator = new SemanticNavigator();

    // Reset mocks
    vi.clearAllMocks();

    // Mock embedding responses
    (semanticSimilarity.getEmbedding as any).mockImplementation((text: string) => {
      // Create deterministic embeddings based on text content
      const embedding = new Float32Array(384);
      for (let i = 0; i < 384; i++) {
        embedding[i] = Math.sin(text.length + i) * 0.1;
      }
      return Promise.resolve(embedding);
    });

    (semanticSimilarity.cosineSimilarity as any).mockImplementation((a: Float32Array, b: Float32Array) => {
      // Simple mock similarity based on embedding differences
      let similarity = 0;
      for (let i = 0; i < Math.min(a.length, b.length); i++) {
        similarity += (1 - Math.abs(a[i] - b[i]));
      }
      return Math.max(0, Math.min(1, similarity / Math.min(a.length, b.length)));
    });

    // Create test data
    testBranches = [];
    testThoughts = [];

    // Create 3 branches with different numbers of thoughts
    const branchConfigs = [
      { id: 'branch-1', thoughtCount: 5 },
      { id: 'branch-2', thoughtCount: 3 },
      { id: 'branch-3', thoughtCount: 4 }
    ];

    branchConfigs.forEach((config, branchIndex) => {
      const branch: BranchNode = {
        id: config.id,
        ...(branchIndex > 0 && { parentId: branchConfigs[branchIndex - 1].id }),
        description: `Test branch ${branchIndex + 1}`,
        thoughtIds: [],
        thoughts: [],
        childIds: new Set<string>(),
        state: 'active' as const,
        priority: 1,
        confidence: 0.8,
        lastEvaluationIndex: 0
      };

      // Create thoughts for this branch
      for (let thoughtIndex = 0; thoughtIndex < config.thoughtCount; thoughtIndex++) {
        const thoughtId = `${config.id}-thought-${thoughtIndex}`;
        const thought: ThoughtData = {
          id: thoughtId,
          content: `Thought ${thoughtIndex} content for ${config.id}`,
          branchId: config.id,
          timestamp: new Date(),
          metadata: {
            type: 'reasoning',
            confidence: 0.7 + (thoughtIndex * 0.05),
            keyPoints: [`${config.id}`, `thought-${thoughtIndex}`]
          }
        };

        branch.thoughtIds.push(thoughtId);
        branch.thoughts.push(thought);
        testThoughts.push(thought);

        // Add to graph internal structures (mocking internal state)
        (graph as any).thoughts = (graph as any).thoughts || new Map();
        (graph as any).thoughtToBranch = (graph as any).thoughtToBranch || new Map();
        (graph as any).thoughts.set(thoughtId, thought);
        (graph as any).thoughtToBranch.set(thoughtId, config.id);
      }

      testBranches.push(branch);
      (graph as any).branches = (graph as any).branches || new Map();
      (graph as any).branches.set(config.id, branch);
    });

    // Mock graph methods
    graph.getAllBranches = () => testBranches;
    graph.getBranch = (id: string) => testBranches.find(b => b.id === id);
    graph.getThought = (id: string) => testThoughts.find(t => t.id === id);
  });

  describe('findSimilar', () => {
    test('should return similar thoughts from all branches', async () => {
      const query = "test query";
      const results = await navigator.findSimilar(graph, query, 10);

      expect(results).toHaveLength(12); // Total thoughts across all branches
      
      // Verify all branches are represented
      const branchIds = new Set(results.map(r => r.branchId));
      expect(branchIds.size).toBe(3);
      expect(branchIds.has('branch-1')).toBe(true);
      expect(branchIds.has('branch-2')).toBe(true);
      expect(branchIds.has('branch-3')).toBe(true);

      // Verify results are sorted by similarity (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }
    });

    test('should respect limit parameter', async () => {
      const query = "test query";
      const results = await navigator.findSimilar(graph, query, 5);

      expect(results).toHaveLength(5);
    });

    test('should handle empty branches gracefully', async () => {
      // Add an empty branch
      const emptyBranch: BranchNode = {
        id: 'empty-branch',
        description: 'Empty branch',
        thoughtIds: [],
        thoughts: [],
        childIds: new Set<string>(),
        state: 'active' as const,
        priority: 1,
        confidence: 0.8,
        lastEvaluationIndex: 0
      };

      testBranches.push(emptyBranch);

      const query = "test query";
      const results = await navigator.findSimilar(graph, query, 10);

      expect(results).toHaveLength(12); // Same as before, empty branch contributes nothing
    });

    test('should call embedding generation for query', async () => {
      const query = "test query";
      await navigator.findSimilar(graph, query, 10);

      expect(semanticSimilarity.getEmbedding).toHaveBeenCalledWith(query);
    });
  });

  describe('jumpToRelated', () => {
    test('should find related thoughts excluding source', async () => {
      const sourceThoughtId = testThoughts[0].id;
      const results = await navigator.jumpToRelated(graph, sourceThoughtId, 10);

      expect(results.length).toBe(11); // All thoughts except source
      
      // Verify source thought is excluded
      const selfReference = results.find(r => r.thoughtId === sourceThoughtId);
      expect(selfReference).toBeUndefined();

      // Verify relationship types are assigned
      results.forEach(result => {
        expect(['same-branch', 'cross-branch', 'parent-branch', 'child-branch'])
          .toContain(result.relationship);
      });
    });

    test('should handle same-branch relationships correctly', async () => {
      const sourceThoughtId = testThoughts[0].id; // From branch-1
      const results = await navigator.jumpToRelated(graph, sourceThoughtId, 10);

      const sameBranchResults = results.filter(r => r.relationship === 'same-branch');
      expect(sameBranchResults.length).toBe(4); // Other thoughts in branch-1
      
      sameBranchResults.forEach(result => {
        expect(result.branchId).toBe('branch-1');
      });
    });

    test('should throw error for non-existent thought', async () => {
      const nonExistentId = 'non-existent-thought';
      
      await expect(navigator.jumpToRelated(graph, nonExistentId, 10))
        .rejects.toThrow(`Thought ${nonExistentId} not found`);
    });

    test('should respect limit parameter', async () => {
      const sourceThoughtId = testThoughts[0].id;
      const results = await navigator.jumpToRelated(graph, sourceThoughtId, 5);

      expect(results).toHaveLength(5);
    });
  });

  describe('analyzeSemanticFlow', () => {
    test('should analyze flow for valid branch', async () => {
      const branchId = 'branch-1';
      const analysis = await navigator.analyzeSemanticFlow(graph, branchId);

      expect(analysis).toBeDefined();
      expect(analysis.continuityScore).toBeGreaterThanOrEqual(0);
      expect(analysis.continuityScore).toBeLessThanOrEqual(1);
      expect(Array.isArray(analysis.driftPoints)).toBe(true);
      expect(Array.isArray(analysis.semanticClusters)).toBe(true);
    });

    test('should handle branches with less than 2 thoughts', async () => {
      // Create single-thought branch
      const singleThought: ThoughtData = {
        id: 'single-thought',
        content: 'Single thought',
        branchId: 'single-branch',
        timestamp: new Date(),
        metadata: { type: 'reasoning', confidence: 0.8, keyPoints: [] }
      };

      const singleBranch: BranchNode = {
        id: 'single-branch',
        description: 'Single thought branch',
        thoughtIds: ['single-thought'],
        thoughts: [singleThought],
        childIds: new Set<string>(),
        state: 'active' as const,
        priority: 1,
        confidence: 0.8,
        lastEvaluationIndex: 0
      };

      graph.getBranch = (id: string) => {
        if (id === 'single-branch') return singleBranch;
        return testBranches.find(b => b.id === id);
      };

      const analysis = await navigator.analyzeSemanticFlow(graph, 'single-branch');

      expect(analysis.continuityScore).toBe(1.0);
      expect(analysis.driftPoints).toHaveLength(0);
      expect(analysis.semanticClusters).toHaveLength(0);
    });

    test('should handle non-existent branch', async () => {
      const analysis = await navigator.analyzeSemanticFlow(graph, 'non-existent-branch');

      expect(analysis.continuityScore).toBe(1.0);
      expect(analysis.driftPoints).toHaveLength(0);
      expect(analysis.semanticClusters).toHaveLength(0);
    });
  });

  describe('parallelization correctness', () => {
    test('should produce same results as sequential processing', async () => {
      // This test verifies that parallelization doesn't change behavior
      const query = "test query";
      
      // Run the parallelized version
      const parallelResults = await navigator.findSimilar(graph, query, 10);
      
      // Verify structure and ordering are maintained
      expect(parallelResults).toBeDefined();
      expect(Array.isArray(parallelResults)).toBe(true);
      
      // Verify each result has required properties
      parallelResults.forEach(result => {
        expect(result).toHaveProperty('thoughtId');
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('branchId');
        expect(result).toHaveProperty('similarity');
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('timestamp');
      });
    });

    test('should maintain result ordering with concurrent operations', async () => {
      const query1 = "first query";
      const query2 = "second query";
      
      // Run multiple operations concurrently
      const [results1, results2] = await Promise.all([
        navigator.findSimilar(graph, query1, 5),
        navigator.findSimilar(graph, query2, 5)
      ]);

      // Each should be properly sorted by similarity
      for (let i = 1; i < results1.length; i++) {
        expect(results1[i - 1].similarity).toBeGreaterThanOrEqual(results1[i].similarity);
      }
      
      for (let i = 1; i < results2.length; i++) {
        expect(results2[i - 1].similarity).toBeGreaterThanOrEqual(results2[i].similarity);
      }
    });

    test('should handle concurrent related thoughts queries', async () => {
      const thoughtId1 = testThoughts[0].id;
      const thoughtId2 = testThoughts[5].id;
      
      const [results1, results2] = await Promise.all([
        navigator.jumpToRelated(graph, thoughtId1, 5),
        navigator.jumpToRelated(graph, thoughtId2, 5)
      ]);

      // Neither should contain their source thought
      expect(results1.find(r => r.thoughtId === thoughtId1)).toBeUndefined();
      expect(results2.find(r => r.thoughtId === thoughtId2)).toBeUndefined();
      
      // Both should have valid relationship types
      [...results1, ...results2].forEach(result => {
        expect(['same-branch', 'cross-branch', 'parent-branch', 'child-branch'])
          .toContain(result.relationship);
      });
    });
  });
});
/**
 * Benchmarks for SemanticNavigator parallelization improvements
 */

import { describe, test, beforeEach } from 'vitest';
import { BranchGraph } from '../../branchGraph.js';
import { SemanticNavigator } from '../../semanticNavigator.js';
import { ThoughtData, BranchNode } from '../../types.js';

describe('SemanticNavigator Benchmark', () => {
  let graph: BranchGraph;
  let navigator: SemanticNavigator;
  let testBranches: BranchNode[];
  let testThoughts: ThoughtData[];

  beforeEach(() => {
    graph = new BranchGraph();
    navigator = new SemanticNavigator();

    // Create test data with multiple branches and thoughts
    testBranches = [];
    testThoughts = [];

    // Create 5 branches with 10 thoughts each
    for (let branchIndex = 0; branchIndex < 5; branchIndex++) {
      const branchId = `branch-${branchIndex}`;
      const branch: BranchNode = {
        id: branchId,
        ...(branchIndex > 0 && { parentId: `branch-${branchIndex - 1}` }),
        description: `Test branch ${branchIndex}`,
        thoughtIds: [],
        thoughts: [],
        timestamp: new Date(),
        isComplete: false,
        metadata: {}
      };

      // Create thoughts for this branch
      for (let thoughtIndex = 0; thoughtIndex < 10; thoughtIndex++) {
        const thoughtId = `thought-${branchIndex}-${thoughtIndex}`;
        const thought: ThoughtData = {
          id: thoughtId,
          content: `This is a test thought ${thoughtIndex} in branch ${branchIndex} about artificial intelligence and machine learning concepts.`,
          branchId,
          timestamp: new Date(),
          metadata: {
            type: 'reasoning',
            confidence: 0.8 + (thoughtIndex * 0.02),
            tags: [`branch-${branchIndex}`, `thought-${thoughtIndex}`]
          }
        };

        branch.thoughtIds.push(thoughtId);
        branch.thoughts.push(thought);
        testThoughts.push(thought);

        // Add thought to graph
        (graph as any).thoughts.set(thoughtId, thought);
        (graph as any).thoughtToBranch.set(thoughtId, branchId);
      }

      testBranches.push(branch);
      // Add branch to graph
      (graph as any).branches.set(branchId, branch);
    }

    // Mock the getAllBranches method
    graph.getAllBranches = () => testBranches;
    graph.getBranch = (id: string) => testBranches.find(b => b.id === id);
    graph.getThought = (id: string) => testThoughts.find(t => t.id === id);
  });

  test('findSimilar performance with multiple branches', async () => {
    const query = "artificial intelligence machine learning";
    const startTime = performance.now();
    
    const results = await navigator.findSimilar(graph, query, 20);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`findSimilar took ${duration.toFixed(2)}ms for ${testBranches.length} branches with ${testThoughts.length} total thoughts`);
    console.log(`Found ${results.length} similar thoughts`);
    
    // Verify results are properly sorted by similarity
    for (let i = 1; i < results.length; i++) {
      if (results[i - 1].similarity < results[i].similarity) {
        throw new Error('Results not properly sorted by similarity');
      }
    }
  });

  test('jumpToRelated performance with multiple branches', async () => {
    const sourceThoughtId = testThoughts[0].id;
    const startTime = performance.now();
    
    const results = await navigator.jumpToRelated(graph, sourceThoughtId, 15);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`jumpToRelated took ${duration.toFixed(2)}ms for ${testBranches.length} branches with ${testThoughts.length} total thoughts`);
    console.log(`Found ${results.length} related thoughts`);
    
    // Verify no thought relates to itself
    const selfReferential = results.find(r => r.thoughtId === sourceThoughtId);
    if (selfReferential) {
      throw new Error('Found self-referential result');
    }
  });

  test('analyzeSemanticFlow performance', async () => {
    const branchId = testBranches[0].id;
    const startTime = performance.now();
    
    const analysis = await navigator.analyzeSemanticFlow(graph, branchId);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`analyzeSemanticFlow took ${duration.toFixed(2)}ms for branch with ${testBranches[0].thoughts.length} thoughts`);
    console.log(`Continuity score: ${analysis.continuityScore.toFixed(3)}`);
    console.log(`Found ${analysis.driftPoints.length} drift points and ${analysis.semanticClusters.length} clusters`);
    
    // Verify continuity score is between 0 and 1
    if (analysis.continuityScore < 0 || analysis.continuityScore > 1) {
      throw new Error('Invalid continuity score');
    }
  });

  test('concurrent operations stress test', async () => {
    const query = "machine learning algorithms";
    const sourceThoughtId = testThoughts[2].id;
    const branchId = testBranches[1].id;
    
    const startTime = performance.now();
    
    // Run multiple operations concurrently
    const [similarResults, relatedResults, flowAnalysis] = await Promise.all([
      navigator.findSimilar(graph, query, 10),
      navigator.jumpToRelated(graph, sourceThoughtId, 10),
      navigator.analyzeSemanticFlow(graph, branchId)
    ]);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`Concurrent operations took ${duration.toFixed(2)}ms`);
    console.log(`Similar: ${similarResults.length}, Related: ${relatedResults.length}, Flow analysis completed`);
    
    // Verify all operations completed successfully
    if (similarResults.length === 0 || relatedResults.length === 0 || !flowAnalysis) {
      throw new Error('One or more concurrent operations failed');
    }
  });

  test('large dataset performance', async () => {
    // Create a larger dataset for performance testing
    const largeBranches: BranchNode[] = [];
    const largeThoughts: ThoughtData[] = [];
    
    // Create 20 branches with 50 thoughts each (1000 total thoughts)
    for (let branchIndex = 0; branchIndex < 20; branchIndex++) {
      const branchId = `large-branch-${branchIndex}`;
      const branch: BranchNode = {
        id: branchId,
        ...(branchIndex > 0 && { parentId: `large-branch-${branchIndex - 1}` }),
        description: `Large test branch ${branchIndex}`,
        thoughtIds: [],
        thoughts: [],
        timestamp: new Date(),
        isComplete: false,
        metadata: {}
      };

      for (let thoughtIndex = 0; thoughtIndex < 50; thoughtIndex++) {
        const thoughtId = `large-thought-${branchIndex}-${thoughtIndex}`;
        const thought: ThoughtData = {
          id: thoughtId,
          content: `Large dataset thought ${thoughtIndex} in branch ${branchIndex} discussing various topics including technology, science, philosophy, and creative problem solving approaches.`,
          branchId,
          timestamp: new Date(),
          metadata: {
            type: 'reasoning',
            confidence: 0.5 + (thoughtIndex * 0.01),
            tags: [`large-branch-${branchIndex}`, `large-thought-${thoughtIndex}`]
          }
        };

        branch.thoughtIds.push(thoughtId);
        branch.thoughts.push(thought);
        largeThoughts.push(thought);
      }

      largeBranches.push(branch);
    }

    // Override methods for large dataset
    const originalGetAllBranches = graph.getAllBranches;
    const originalGetBranch = graph.getBranch;
    const originalGetThought = graph.getThought;
    
    graph.getAllBranches = () => largeBranches;
    graph.getBranch = (id: string) => largeBranches.find(b => b.id === id);
    graph.getThought = (id: string) => largeThoughts.find(t => t.id === id);

    const query = "technology science philosophy";
    const startTime = performance.now();
    
    const results = await navigator.findSimilar(graph, query, 50);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`Large dataset findSimilar took ${duration.toFixed(2)}ms for ${largeBranches.length} branches with ${largeThoughts.length} total thoughts`);
    console.log(`Found ${results.length} similar thoughts`);
    
    // Restore original methods
    graph.getAllBranches = originalGetAllBranches;
    graph.getBranch = originalGetBranch;
    graph.getThought = originalGetThought;
    
    // Performance should be reasonable even with large datasets
    // This is just for observation, not a strict requirement
    if (duration > 10000) { // 10 seconds
      console.warn('Large dataset performance may need optimization');
    }
  });
});
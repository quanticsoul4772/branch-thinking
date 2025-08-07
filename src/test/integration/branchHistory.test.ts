import { describe, it, expect, beforeEach } from 'vitest';
import { BranchGraph } from '../../branchGraph.js';
import type { ThoughtType, BranchState } from '../../types.js';

describe('Branch History and Focus Integration', () => {
  let graph: BranchGraph;

  beforeEach(() => {
    graph = new BranchGraph();
  });

  it('should create and manage multiple branches with proper history', async () => {
    // Create main branch thoughts
    const mainThought1 = graph.addThought({
      content: 'Analyzing user authentication requirements',
      type: 'analysis' as ThoughtType,
      confidence: 0.8,
      keyPoints: ['security', 'user-experience']
    });

    const mainThought2 = graph.addThought({
      content: 'Security considerations for authentication',
      type: 'analysis' as ThoughtType,
      confidence: 0.9,
      keyPoints: ['security', 'vulnerabilities']
    });

    // Create first solution branch
    const oauthBranch = graph.addThought({
      content: 'Implementing OAuth2 with third-party providers',
      type: 'solution' as ThoughtType,
      parentBranchId: 'main',
      confidence: 0.8,
      keyPoints: ['oauth2', 'third-party', 'google', 'github']
    });

    // Create second solution branch
    const jwtBranch = graph.addThought({
      content: 'JWT-based authentication with local storage',
      type: 'solution' as ThoughtType,
      parentBranchId: 'main',
      confidence: 0.7,
      keyPoints: ['jwt', 'local', 'stateless']
    });

    // Create third solution branch
    const sessionBranch = graph.addThought({
      content: 'Traditional session-based authentication',
      type: 'solution' as ThoughtType,
      parentBranchId: 'main',
      confidence: 0.6,
      keyPoints: ['sessions', 'server-side', 'cookies']
    });

    // Verify we have at least 4 branches (main + 3 solution branches)
    const branches = graph.getAllBranches();
    expect(branches.length).toBeGreaterThanOrEqual(4);

    // Test branch focus switching
    const oauthBranchId = branches.find(b => 
      b.thoughts.some(t => t.content.includes('OAuth2'))
    )?.id;
    
    expect(oauthBranchId).toBeDefined();
    
    if (oauthBranchId) {
      graph.focusOnBranch(oauthBranchId);
      expect(graph.getCurrentBranchId()).toBe(oauthBranchId);
    }

    // Add thoughts to focused branch and verify history
    const oauthDetail = graph.addThought({
      content: 'Configure Google OAuth2 provider settings',
      type: 'hypothesis' as ThoughtType,
      confidence: 0.9,
      keyPoints: ['google-oauth', 'client-id', 'redirect-uri']
    });

    const oauthImplementation = graph.addThought({
      content: 'Implement callback handler for OAuth2 flow',
      type: 'validation' as ThoughtType,
      confidence: 0.8,
      keyPoints: ['callback', 'token-exchange', 'user-info']
    });

    // Test branch history retrieval
    if (oauthBranchId) {
      const history = graph.getBranchHistory(oauthBranchId);
      expect(history.length).toBeGreaterThanOrEqual(3); // Original + 2 new thoughts
      
      // Verify chronological order
      for (let i = 1; i < history.length; i++) {
        expect(history[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          history[i - 1].createdAt.getTime()
        );
      }
    }

    // Test cross-branch references
    const jwtBranchId = branches.find(b => 
      b.thoughts.some(t => t.content.includes('JWT'))
    )?.id;

    if (jwtBranchId && oauthBranchId) {
      const crossRefSuccess = graph.crossReference(
        oauthBranchId,
        jwtBranchId,
        'alternative',
        'Both are viable authentication approaches with different trade-offs',
        0.7
      );
      expect(crossRefSuccess).toBe(true);
    }

    // Test branch state transitions
    if (oauthBranchId) {
      graph.setBranchState(oauthBranchId, 'completed' as BranchState);
      
      const updatedBranches = graph.getAllBranches();
      const completedBranch = updatedBranches.find(b => b.id === oauthBranchId);
      expect(completedBranch?.state).toBe('completed');
    }

    // Test branch priority and navigation
    const branchStats = graph.getBranchStatistics();
    expect(branchStats.totalBranches).toBeGreaterThanOrEqual(4);
    expect(branchStats.activeBranches).toBeGreaterThan(0);
  });

  it('should handle complex branch relationships and history queries', () => {
    // Create a complex branching structure
    const rootAnalysis = graph.addThought({
      content: 'Database design for e-commerce platform',
      type: 'analysis' as ThoughtType,
      confidence: 0.9
    });

    // Create multiple database approach branches
    const mysqlBranch = graph.addThought({
      content: 'MySQL with normalized schema design',
      type: 'solution' as ThoughtType,
      parentBranchId: 'main',
      confidence: 0.8
    });

    const mongoBranch = graph.addThought({
      content: 'MongoDB with document-based collections',
      type: 'solution' as ThoughtType, 
      parentBranchId: 'main',
      confidence: 0.7
    });

    const postgresBranch = graph.addThought({
      content: 'PostgreSQL with JSON columns for flexibility',
      type: 'solution' as ThoughtType,
      parentBranchId: 'main',
      confidence: 0.85
    });

    // Get branch IDs for further testing
    const branches = graph.getAllBranches();
    const mysqlBranchId = branches.find(b => 
      b.thoughts.some(t => t.content.includes('MySQL'))
    )?.id;
    
    const mongoBranchId = branches.find(b => 
      b.thoughts.some(t => t.content.includes('MongoDB'))
    )?.id;

    // Create sub-branches from MySQL branch
    if (mysqlBranchId) {
      graph.focusOnBranch(mysqlBranchId);
      
      const indexingStrategy = graph.addThought({
        content: 'Implement composite indexes for product queries',
        type: 'hypothesis' as ThoughtType,
        confidence: 0.8
      });

      const shardingStrategy = graph.addThought({
        content: 'Consider horizontal sharding by user region',
        type: 'hypothesis' as ThoughtType,
        confidence: 0.6
      });
    }

    // Verify complex history tracking works
    if (mysqlBranchId) {
      const mysqlHistory = graph.getBranchHistory(mysqlBranchId);
      expect(mysqlHistory.length).toBeGreaterThanOrEqual(3);
      
      // Verify parent-child relationships are maintained
      const hasParentThought = mysqlHistory.some(t => 
        t.content.includes('MySQL with normalized')
      );
      expect(hasParentThought).toBe(true);
    }

    // Test branch comparison and analytics
    if (mysqlBranchId && mongoBranchId) {
      graph.crossReference(
        mysqlBranchId,
        mongoBranchId,
        'contradictory',
        'Relational vs document-based approaches have fundamental differences',
        0.9
      );

      // Verify contradiction detection works across branches
      const contradictions = graph.findContradictions();
      expect(contradictions.length).toBeGreaterThan(0);
    }
  });

  it('should maintain focus context across branch switches', () => {
    // Create initial branches
    const apiDesign = graph.addThought({
      content: 'REST API endpoint design principles',
      type: 'analysis' as ThoughtType,
      confidence: 0.8
    });

    const restBranch = graph.addThought({
      content: 'RESTful API with standard HTTP methods',
      type: 'solution' as ThoughtType,
      parentBranchId: 'main',
      confidence: 0.7
    });

    const graphqlBranch = graph.addThought({
      content: 'GraphQL API with flexible queries',
      type: 'solution' as ThoughtType,
      parentBranchId: 'main', 
      confidence: 0.8
    });

    const branches = graph.getAllBranches();
    const restBranchId = branches.find(b => 
      b.thoughts.some(t => t.content.includes('RESTful'))
    )?.id;
    
    const graphqlBranchId = branches.find(b => 
      b.thoughts.some(t => t.content.includes('GraphQL'))
    )?.id;

    // Test focus switching and context preservation
    if (restBranchId && graphqlBranchId) {
      // Focus on REST branch and add content
      graph.focusOnBranch(restBranchId);
      expect(graph.getCurrentBranchId()).toBe(restBranchId);

      const restDetail = graph.addThought({
        content: 'Implement pagination with limit/offset parameters',
        type: 'validation' as ThoughtType,
        confidence: 0.8
      });

      // Switch to GraphQL branch
      graph.focusOnBranch(graphqlBranchId);
      expect(graph.getCurrentBranchId()).toBe(graphqlBranchId);

      const graphqlDetail = graph.addThought({
        content: 'Define schema with nested resolvers',
        type: 'validation' as ThoughtType,
        confidence: 0.9
      });

      // Verify both branches maintained their history correctly
      const restHistory = graph.getBranchHistory(restBranchId);
      const graphqlHistory = graph.getBranchHistory(graphqlBranchId);

      expect(restHistory.some(t => t.content.includes('pagination'))).toBe(true);
      expect(graphqlHistory.some(t => t.content.includes('schema'))).toBe(true);

      // Verify thoughts stayed in correct branches
      expect(restHistory.some(t => t.content.includes('schema'))).toBe(false);
      expect(graphqlHistory.some(t => t.content.includes('pagination'))).toBe(false);
    }
  });
});
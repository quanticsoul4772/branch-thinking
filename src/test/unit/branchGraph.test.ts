import { describe, it, expect, beforeEach } from 'vitest';
import { BranchGraph, AddThoughtParams } from '../../branchGraph.js';
import type { BranchState, ThoughtType } from '../../types.js';

describe('BranchGraph Core Operations', () => {
  let graph: BranchGraph;

  beforeEach(() => {
    graph = new BranchGraph();
  });

  describe('addThought', () => {
    it('should add a thought to main branch', () => {
      const params: AddThoughtParams = {
        content: 'Test thought',
        type: 'analysis' as ThoughtType,
        confidence: 0.8,
        keyPoints: ['testing', 'unit-tests']
      };

      const result = graph.addThought(params);

      expect(result.thoughtId).toBeDefined();
      expect(result.thoughtId.length).toBeGreaterThan(0);
    });

    it('should create new branch with parentBranchId', () => {
      const params: AddThoughtParams = {
        content: 'Branch thought',
        type: 'hypothesis' as ThoughtType,
        parentBranchId: 'main',
        confidence: 0.7
      };

      const result = graph.addThought(params);

      expect(result.thoughtId).toBeDefined();
      
      // Verify branch was created
      const branches = graph.getAllBranches();
      expect(branches.length).toBeGreaterThan(1);
    });

    it('should detect content overlap and suggest existing branch', () => {
      // Add first thought
      const params1: AddThoughtParams = {
        content: 'Implementing OAuth2 authentication system',
        type: 'solution' as ThoughtType,
        confidence: 0.9
      };
      graph.addThought(params1);

      // Add very similar thought
      const params2: AddThoughtParams = {
        content: 'OAuth2 authentication implementation approach',
        type: 'solution' as ThoughtType,
        confidence: 0.8
      };
      
      const result = graph.addThought(params2);

      expect(result.overlapWarning).toBeDefined();
      if (result.overlapWarning) {
        expect(result.overlapWarning.currentSimilarity).toBeGreaterThan(0.7);
      }
    });

    it('should handle cross-references correctly', () => {
      // Create base thought
      const params1: AddThoughtParams = {
        content: 'Database layer implementation',
        type: 'solution' as ThoughtType,
        confidence: 0.8
      };
      const result1 = graph.addThought(params1);

      // Create thought with cross-reference
      const params2: AddThoughtParams = {
        content: 'Caching strategy for database',
        type: 'solution' as ThoughtType,
        confidence: 0.7,
        crossRefs: [{
          toBranch: result1.thoughtId,
          type: 'builds_upon',
          reason: 'Extends database implementation',
          strength: 0.9
        }]
      };

      const result2 = graph.addThought(params2);
      expect(result2.thoughtId).toBeDefined();
    });
  });

  describe('cross-references via addThought', () => {
    let thoughtId1: string;
    let branchId1: string;
    let branchId2: string;

    beforeEach(() => {
      const result1 = graph.addThought({
        content: 'First thought',
        type: 'analysis' as ThoughtType,
        parentBranchId: 'main'
      });
      thoughtId1 = result1.thoughtId;
      
      // Find the branch that was created
      const branches = graph.getAllBranches();
      branchId1 = branches.find(b => 
        b.thoughts.some(t => t.content === 'First thought')
      )?.id || 'main';
      
      const result2 = graph.addThought({
        content: 'Second thought', 
        type: 'hypothesis' as ThoughtType,
        parentBranchId: 'main'
      });
      
      branchId2 = branches.find(b => 
        b.thoughts.some(t => t.content === 'Second thought')
      )?.id || 'main';
    });

    it('should create cross-reference via addThought', () => {
      const result = graph.addThought({
        content: 'Cross-referenced thought',
        type: 'validation' as ThoughtType,
        branchId: branchId1,
        crossRefs: [{
          toBranch: branchId2,
          type: 'complementary',
          reason: 'Both approaches solve different aspects',
          strength: 0.8
        }]
      });

      expect(result.thoughtId).toBeDefined();
    });

    it('should handle cross-reference with valid branch IDs', () => {
      const result = graph.addThought({
        content: 'Building upon previous work',
        type: 'solution' as ThoughtType,
        crossRefs: [{
          toBranch: branchId1,
          type: 'builds_upon',
          reason: 'Test reason',
          strength: 0.5
        }]
      });

      expect(result.thoughtId).toBeDefined();
    });

    it('should allow multiple cross-references in single thought', () => {
      const result = graph.addThought({
        content: 'Analysis combining multiple approaches',
        type: 'analysis' as ThoughtType,
        crossRefs: [
          {
            toBranch: branchId1,
            type: 'builds_upon',
            reason: 'First reference',
            strength: 0.8
          },
          {
            toBranch: branchId2,
            type: 'complementary',
            reason: 'Second reference',
            strength: 0.7
          }
        ]
      });

      expect(result.thoughtId).toBeDefined();
    });
  });

  describe('circular reasoning detection', () => {
    it('should detect circular reasoning patterns', () => {
      // Add thoughts that might create circular reasoning
      const result1 = graph.addThought({
        content: 'OAuth2 is the best authentication method',
        type: 'validation' as ThoughtType,
        confidence: 0.9
      });

      const branches = graph.getAllBranches();
      const branch1 = branches.find(b => 
        b.thoughts.some(t => t.content.includes('OAuth2 is the best'))
      )?.id;

      if (branch1) {
        graph.addThought({
          content: 'JWT tokens support OAuth2 implementation',
          type: 'validation' as ThoughtType, 
          confidence: 0.8,
          crossRefs: [{
            toBranch: branch1,
            type: 'builds_upon',
            reason: 'Extends OAuth2 concept',
            strength: 0.8
          }]
        });
      }

      const circularPatterns = graph.detectCircularReasoning();
      expect(Array.isArray(circularPatterns)).toBe(true);
      expect(circularPatterns.length).toBeGreaterThan(0);
    });

    it('should handle independent statements without circular reasoning', () => {
      graph.addThought({
        content: 'Use Redis for session caching',
        type: 'solution' as ThoughtType,
        confidence: 0.8
      });

      graph.addThought({
        content: 'Use Memcached for query result caching',
        type: 'solution' as ThoughtType,
        confidence: 0.7
      });

      const circularPatterns = graph.detectCircularReasoning();
      expect(circularPatterns).toBeDefined();
    });
  });

  describe('branch management', () => {
    it('should list all branches', () => {
      // Add thoughts to create branches
      graph.addThought({
        content: 'Main branch thought',
        type: 'analysis' as ThoughtType
      });

      graph.addThought({
        content: 'New branch thought',
        type: 'hypothesis' as ThoughtType,
        parentBranchId: 'main'
      });

      const branches = graph.getAllBranches();
      expect(branches.length).toBeGreaterThanOrEqual(2);
      expect(branches.some(b => b.id === 'main')).toBe(true);
    });

    it('should maintain branch integrity', () => {
      const result = graph.addThought({
        content: 'Test branch',
        type: 'solution' as ThoughtType,
        parentBranchId: 'main'
      });

      const branches = graph.getAllBranches();
      const newBranch = branches.find(b => b.id !== 'main');
      
      if (newBranch) {
        // Verify branch has expected properties
        expect(newBranch.id).toBeDefined();
        expect(newBranch.thoughts.length).toBeGreaterThan(0);
        expect(newBranch.parentBranchId).toBe('main');
        
        // Verify branch can be retrieved individually
        const retrievedBranch = graph.getBranch(newBranch.id);
        expect(retrievedBranch).toBeDefined();
        expect(retrievedBranch?.id).toBe(newBranch.id);
      }
    });
  });
});
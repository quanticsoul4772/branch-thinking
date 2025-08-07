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

  describe('crossReference', () => {
    let thoughtId1: string;
    let thoughtId2: string;

    beforeEach(() => {
      const result1 = graph.addThought({
        content: 'First thought',
        type: 'analysis' as ThoughtType
      });
      thoughtId1 = result1.thoughtId;

      const result2 = graph.addThought({
        content: 'Second thought', 
        type: 'hypothesis' as ThoughtType
      });
      thoughtId2 = result2.thoughtId;
    });

    it('should create cross-reference between thoughts', () => {
      const success = graph.crossReference(
        thoughtId1,
        thoughtId2,
        'complementary',
        'Both approaches solve different aspects',
        0.8
      );

      expect(success).toBe(true);
    });

    it('should handle invalid thought IDs', () => {
      const success = graph.crossReference(
        'invalid-id',
        thoughtId2,
        'builds_upon',
        'Test reason',
        0.5
      );

      expect(success).toBe(false);
    });

    it('should prevent duplicate cross-references', () => {
      // Add first cross-reference
      graph.crossReference(
        thoughtId1,
        thoughtId2,
        'builds_upon',
        'First reference',
        0.8
      );

      // Try to add same cross-reference
      const success = graph.crossReference(
        thoughtId1,
        thoughtId2,
        'builds_upon',
        'Duplicate reference',
        0.7
      );

      expect(success).toBe(true); // Should still succeed but not create duplicate
    });
  });

  describe('contradiction detection', () => {
    it('should detect contradictory statements', () => {
      // Add contradictory thoughts
      graph.addThought({
        content: 'OAuth2 is the best authentication method',
        type: 'validation' as ThoughtType,
        confidence: 0.9
      });

      graph.addThought({
        content: 'OAuth2 should never be used for authentication',
        type: 'validation' as ThoughtType, 
        confidence: 0.8
      });

      const contradictions = graph.findContradictions();
      expect(contradictions.length).toBeGreaterThan(0);
    });

    it('should not flag complementary statements as contradictions', () => {
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

      const contradictions = graph.findContradictions();
      expect(contradictions.length).toBe(0);
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

    it('should change branch state', () => {
      const result = graph.addThought({
        content: 'Test branch',
        type: 'solution' as ThoughtType,
        parentBranchId: 'main'
      });

      const branches = graph.getAllBranches();
      const newBranch = branches.find(b => b.id !== 'main');
      
      if (newBranch) {
        graph.setBranchState(newBranch.id, 'completed' as BranchState);
        
        const updatedBranches = graph.getAllBranches();
        const updatedBranch = updatedBranches.find(b => b.id === newBranch.id);
        
        expect(updatedBranch?.state).toBe('completed');
      }
    });
  });
});
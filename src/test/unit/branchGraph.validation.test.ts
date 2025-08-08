import { describe, it, expect, beforeEach } from 'vitest';
import { BranchGraph } from '../../branchGraph.js';
import { BranchGraphAnalytics } from '../../utils/BranchGraphAnalytics.js';
import { getConfig } from '../../config.js';
import { 
  ValidationError, 
  BranchNotFoundError, 
  ThoughtNotFoundError 
} from '../../utils/customErrors.js';

describe('BranchGraph Input Validation and Error Handling', () => {
  let graph: BranchGraph;

  beforeEach(() => {
    graph = new BranchGraph();
  });

  describe('addThought validation', () => {
    it('should throw ValidationError for null input', async () => {
      await expect(graph.addThought(null as any)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for undefined input', async () => {
      await expect(graph.addThought(undefined as any)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for empty content', async () => {
      await expect(graph.addThought({
        content: '',
        type: 'analysis'
      })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for whitespace-only content', async () => {
      await expect(graph.addThought({
        content: '   \n\t   ',
        type: 'analysis'
      })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for non-string content', async () => {
      await expect(graph.addThought({
        content: 123 as any,
        type: 'analysis'
      })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for content exceeding maximum length', async () => {
      const config = getConfig();
      const maxLength = config.maxContentLength || 10000;
      const longContent = 'a'.repeat(maxLength + 1);
      await expect(graph.addThought({
        content: longContent,
        type: 'analysis'
      })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid branchId', async () => {
      await expect(graph.addThought({
        content: 'Test content',
        type: 'analysis',
        branchId: ''
      })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for branchId with invalid characters', async () => {
      await expect(graph.addThought({
        content: 'Test content',
        type: 'analysis',
        branchId: 'branch@#$%'
      })).rejects.toThrow(ValidationError);
    });

    it('should throw BranchNotFoundError for non-existent parentBranchId', async () => {
      await expect(graph.addThought({
        content: 'Test content',
        type: 'analysis',
        parentBranchId: 'non-existent-branch'
      })).rejects.toThrow(BranchNotFoundError);
    });

    it('should throw ValidationError for invalid confidence value', async () => {
      await expect(graph.addThought({
        content: 'Test content',
        type: 'analysis',
        confidence: 1.5 // exceeds maximum
      })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for negative confidence', async () => {
      await expect(graph.addThought({
        content: 'Test content',
        type: 'analysis',
        confidence: -0.1
      })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for non-array crossRefs', async () => {
      await expect(graph.addThought({
        content: 'Test content',
        type: 'analysis',
        crossRefs: 'not-an-array' as any
      })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid cross-reference strength', async () => {
      // First create a branch to reference
      const branch = graph.createBranch();
      
      await expect(graph.addThought({
        content: 'Test content',
        type: 'analysis',
        crossRefs: [{
          toBranch: branch,
          type: 'builds_upon',
          reason: 'Test reason',
          strength: 2.0 // exceeds maximum
        }]
      })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for cross-reference with empty reason', async () => {
      const branch = graph.createBranch();
      
      await expect(graph.addThought({
        content: 'Test content',
        type: 'analysis',
        crossRefs: [{
          toBranch: branch,
          type: 'builds_upon',
          reason: '',
          strength: 0.8
        }]
      })).rejects.toThrow(ValidationError);
    });
  });

  describe('branch operations validation', () => {
    it('should throw ValidationError for empty branch ID in createBranchWithId', () => {
      expect(() => graph.createBranchWithId('', undefined)).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid branch ID characters', () => {
      expect(() => graph.createBranchWithId('invalid@branch', undefined)).toThrow(ValidationError);
    });

    it('should throw ValidationError for duplicate branch ID', () => {
      graph.createBranchWithId('test-branch', undefined);
      expect(() => graph.createBranchWithId('test-branch', undefined)).toThrow(ValidationError);
    });

    it('should throw BranchNotFoundError for non-existent parent branch', () => {
      expect(() => graph.createBranch('non-existent-parent')).toThrow(BranchNotFoundError);
    });
  });

  describe('getter methods validation', () => {
    it('should throw ValidationError for invalid thought ID in getThought', () => {
      expect(() => graph.getThought('')).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-string thought ID', () => {
      expect(() => graph.getThought(123 as any)).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid branch ID in getBranch', () => {
      expect(() => graph.getBranch('')).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-string branch ID', () => {
      expect(() => graph.getBranch(null as any)).toThrow(ValidationError);
    });

    it('should throw BranchNotFoundError for non-existent branch in getRecentThoughts', () => {
      expect(() => graph.getRecentThoughts('non-existent', 5)).toThrow(BranchNotFoundError);
    });

    it('should throw ValidationError for negative count in getRecentThoughts', () => {
      const branchId = graph.createBranch();
      expect(() => graph.getRecentThoughts(branchId, -1)).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-number count in getRecentThoughts', () => {
      const branchId = graph.createBranch();
      expect(() => graph.getRecentThoughts(branchId, 'five' as any)).toThrow(ValidationError);
    });
  });

  describe('search methods validation', () => {
    it('should throw BranchNotFoundError for non-existent start branch in breadthFirstSearch', () => {
      expect(() => graph.breadthFirstSearch('non-existent', 3)).toThrow(BranchNotFoundError);
    });

    it('should throw ValidationError for negative max depth in breadthFirstSearch', () => {
      const branchId = graph.createBranch();
      expect(() => graph.breadthFirstSearch(branchId, -1)).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-RegExp pattern in searchThoughts', () => {
      expect(() => graph.searchThoughts('not-a-regex' as any)).toThrow(ValidationError);
    });
  });

  describe('similarity calculation validation', () => {
    beforeEach(async () => {
      // Create some test thoughts
      await graph.addThought({
        content: 'First test thought',
        type: 'analysis'
      });
      await graph.addThought({
        content: 'Second test thought',
        type: 'analysis'
      });
    });

    it('should throw ThoughtNotFoundError for non-existent thought in calculateSimilarity', () => {
      expect(() => graph.calculateSimilarity('non-existent', 'also-non-existent')).toThrow(ThoughtNotFoundError);
    });

    it('should throw ThoughtNotFoundError for non-existent thought in getMostSimilarThoughts', () => {
      expect(() => graph.getMostSimilarThoughts('non-existent')).toThrow(ThoughtNotFoundError);
    });

    it('should throw ValidationError for invalid topK in getMostSimilarThoughts', async () => {
      const result = await graph.addThought({
        content: 'Test thought for similarity',
        type: 'analysis'
      });
      
      expect(() => graph.getMostSimilarThoughts(result.thoughtId, 0)).toThrow(ValidationError);
    });
  });

  describe('error message quality', () => {
    it('should provide specific error messages for validation failures', async () => {
      try {
        await graph.addThought({
          content: '',
          type: 'analysis'
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('empty');
      }
    });

    it('should include field information in validation errors', async () => {
      try {
        await graph.addThought({
          content: 'Valid content',
          type: 'analysis',
          confidence: 2.0
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe('confidence');
      }
    });

    it('should include branch ID in BranchNotFoundError', () => {
      try {
        graph.createBranch('non-existent-parent');
      } catch (error) {
        expect(error).toBeInstanceOf(BranchNotFoundError);
        expect((error as BranchNotFoundError).branchId).toBe('non-existent-parent');
      }
    });
  });

  describe('error recovery and graceful degradation', () => {
    it('should continue working after validation error', async () => {
      // First attempt fails
      try {
        await graph.addThought({
          content: '',
          type: 'analysis'
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
      }
      
      // Second attempt should work
      const result = await graph.addThought({
        content: 'Valid content',
        type: 'analysis'
      });
      
      expect(result.thoughtId).toBeDefined();
    });
it('should handle edge cases in similarity calculation gracefully', () => {
  // Create a separate analytics instance for direct testing
  const analytics = new BranchGraphAnalytics(graph['storage']);
  
      
      // Empty strings should return 1.0 (identical)
      expect(analytics.computeCosineSimilarity('', '')).toBe(1.0);
      
      // One empty string should return 0.0
      expect(analytics.computeCosineSimilarity('test', '')).toBe(0.0);
      expect(analytics.computeCosineSimilarity('', 'test')).toBe(0.0);
    });
  });
});
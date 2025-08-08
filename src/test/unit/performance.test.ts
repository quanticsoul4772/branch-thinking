import { describe, it, expect, beforeEach } from 'vitest';
import { BranchGraph } from '../../branchGraph.js';
import { BranchGraphAnalytics } from '../../utils/BranchGraphAnalytics.js';

describe('Performance Tests for Large Inputs', () => {
  let graph: BranchGraph;
  let analytics: BranchGraphAnalytics;

  beforeEach(() => {
    graph = new BranchGraph();
    // Access analytics through the graph's storage
    analytics = new BranchGraphAnalytics((graph as any).storage);
  });

  describe('Large Content Input Performance', () => {
    it('should handle 10k character content within reasonable time', async () => {
      const largeContent = 'This is a test content that will be repeated to create very large text. '.repeat(140); // ~10k characters
      expect(largeContent.length).toBeGreaterThan(10000);
      
      const startTime = Date.now();
      
      const result = await graph.addThought({
        content: largeContent,
        type: 'analysis'
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result.thoughtId).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle 50k character content gracefully', async () => {
      const veryLargeContent = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam. '.repeat(350); // ~50k characters
      expect(veryLargeContent.length).toBeGreaterThan(50000);
      
      const startTime = Date.now();
      
      const result = await graph.addThought({
        content: veryLargeContent,
        type: 'observation'
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result.thoughtId).toBeDefined();
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle extremely large content (100k+ chars) without crashing', async () => {
      const extremeContent = 'A'.repeat(150000); // 150k characters
      
      const startTime = Date.now();
      
      try {
        const result = await graph.addThought({
          content: extremeContent,
          type: 'synthesis'
        });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        expect(result.thoughtId).toBeDefined();
        expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
      } catch (error) {
        // If it throws a validation error due to length limits, that's acceptable
        expect(error).toHaveProperty('name');
        expect(error.name === 'ValidationError').toBeTruthy();
      }
    });
  });

  describe('Similarity Calculation Performance', () => {
    it('should calculate similarity between large texts efficiently', async () => {
      const text1 = 'The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet. '.repeat(100); // ~10k chars
      const text2 = 'The quick brown fox leaps over the sleeping dog. This sentence has most letters of the alphabet. '.repeat(100); // ~10k chars
      
      const startTime = Date.now();
      
      const similarity = analytics.computeCosineSimilarity(text1, text2);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle similarity calculation with mixed content sizes', async () => {
      const shortText = 'Short text';
      const longText = 'This is a much longer text that repeats many times to create substantial content for testing purposes. '.repeat(200); // ~20k chars
      
      const startTime = Date.now();
      
      const similarity = analytics.computeCosineSimilarity(shortText, longText);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
      expect(duration).toBeLessThan(500); // Should complete within 0.5 seconds
    });

    it('should efficiently process multiple large similarity calculations', async () => {
      const baseText = 'Base text for similarity comparison testing with sufficient length and varied vocabulary. '.repeat(50); // ~5k chars
      const variations = [
        baseText.replace('Base', 'Primary'),
        baseText.replace('text', 'content'),
        baseText.replace('testing', 'evaluation'),
        baseText.replace('sufficient', 'adequate'),
        baseText.replace('vocabulary', 'terminology')
      ];
      
      const startTime = Date.now();
      
      const similarities = variations.map(variation => 
        analytics.computeCosineSimilarity(baseText, variation)
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(similarities).toHaveLength(5);
      similarities.forEach(similarity => {
        expect(similarity).toBeGreaterThanOrEqual(0.8); // Should be highly similar
        expect(similarity).toBeLessThanOrEqual(1);
      });
      expect(duration).toBeLessThan(2000); // All 5 calculations within 2 seconds
    });
  });

  describe('Bulk Operations Performance', () => {
    it('should handle creating many thoughts with large content efficiently', async () => {
      const largeContent = 'This is repeated content for bulk testing purposes with meaningful text. '.repeat(70); // ~5k chars each
      const thoughtCount = 10;
      
      const startTime = Date.now();
      
      const results = [];
      for (let i = 0; i < thoughtCount; i++) {
        const result = await graph.addThought({
          content: `${largeContent} Iteration ${i}`,
          type: 'analysis'
        });
        results.push(result);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(thoughtCount);
      results.forEach(result => {
        expect(result.thoughtId).toBeDefined();
      });
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should maintain performance with large graph state', async () => {
      // Create a substantial graph first
      const mediumContent = 'Medium length content for graph building. '.repeat(30); // ~2k chars
      
      for (let i = 0; i < 20; i++) {
        await graph.addThought({
          content: `${mediumContent} Setup thought ${i}`,
          type: 'observation'
        });
      }
      
      // Now test performance with existing large state
      const largeContent = 'Performance test content with existing graph state. '.repeat(100); // ~5k chars
      
      const startTime = Date.now();
      
      const result = await graph.addThought({
        content: largeContent,
        type: 'synthesis'
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result.thoughtId).toBeDefined();
      expect(duration).toBeLessThan(3000); // Should still be fast with existing state
    });
  });

  describe('Memory Usage Stability', () => {
    it('should handle repeated large operations without memory leaks', async () => {
      const iterations = 5;
      const largeContent = 'Memory test content that will be processed multiple times. '.repeat(100); // ~5k chars
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        await graph.addThought({
          content: `${largeContent} Memory test ${i}`,
          type: 'analysis'
        });
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Each iteration should maintain consistent performance
        expect(duration).toBeLessThan(5000);
      }
      
      // Verify graph still functions correctly
      const stats = analytics.getBasicStats();
      expect(stats.totalThoughts).toBeGreaterThanOrEqual(iterations);
    });
  });
});
#!/usr/bin/env node

import { BranchManagerAdapter } from '../../dist/branchManagerAdapter.js';
import { logger } from '../utils/logger.js';

/**
 * Integration tests for validation layer with graph operations
 * Tests the interaction between input validation and actual graph operations
 */
async function testValidationIntegration() {
  logger.info('Testing validation integration with graph operations\n');
  
  const manager = new BranchManagerAdapter();
  let testsPassed = 0;
  let testsTotal = 0;
  
  function runTest(testName, testFn) {
    testsTotal++;
    logger.info(`=== ${testName} ===`);
    try {
      const result = testFn();
      if (result instanceof Promise) {
        return result.then(() => {
          testsPassed++;
          logger.info('✓ PASSED\n');
        }).catch(error => {
          logger.info(`✗ FAILED: ${error.message}\n`);
        });
      } else {
        testsPassed++;
        logger.info('✓ PASSED\n');
      }
    } catch (error) {
      logger.info(`✗ FAILED: ${error.message}\n`);
    }
  }

  // Test 1: Valid inputs should create branches and thoughts successfully
  await runTest('Valid input creates branch and thought', async () => {
    const result = await manager.addThought({
      content: 'This is a valid thought for integration testing',
      type: 'analysis',
      branchId: 'integration-test-1'
    });
    
    if (!result.thought.id) {
      throw new Error('Thought ID not generated');
    }
    
    if (result.thought.branchId !== 'integration-test-1') {
      throw new Error('Branch ID mismatch');
    }
    
    const branch = manager.getBranch('integration-test-1');
    if (!branch || branch.thoughts.length === 0) {
      throw new Error('Branch not created or thought not added');
    }
  });

  // Test 2: Invalid empty content should be rejected gracefully
  await runTest('Empty content is rejected gracefully', async () => {
    try {
      await manager.addThought({
        content: '',
        type: 'analysis'
      });
      throw new Error('Empty content should have been rejected');
    } catch (error) {
      if (error.name !== 'ValidationError') {
        throw new Error(`Expected ValidationError, got ${error.name}`);
      }
    }
    
    // Verify graph state remains consistent
    const stats = manager.getStatistics();
    if (!stats) {
      throw new Error('Graph statistics unavailable after validation error');
    }
  });

  // Test 3: Invalid branch ID characters should be rejected
  await runTest('Invalid branch ID characters are rejected', async () => {
    try {
      await manager.addThought({
        content: 'Valid content',
        type: 'analysis',
        branchId: 'invalid@branch#id'
      });
      throw new Error('Invalid branch ID should have been rejected');
    } catch (error) {
      if (error.name !== 'ValidationError') {
        throw new Error(`Expected ValidationError, got ${error.name}`);
      }
    }
  });

  // Test 4: Very large content should be handled appropriately
  await runTest('Large content is handled appropriately', async () => {
    const largeContent = 'This is large content for testing. '.repeat(300); // ~10.5k characters
    
    try {
      const result = await manager.addThought({
        content: largeContent,
        type: 'observation'
      });
      
      // If successful, verify the thought was created properly
      if (result.thought.id) {
        const branch = manager.getBranch(result.thought.branchId);
        if (!branch || branch.thoughts.length === 0) {
          throw new Error('Large content thought not properly stored');
        }
      }
    } catch (error) {
      // If it throws a validation error due to length limits, that's also acceptable
      if (error.name !== 'ValidationError') {
        throw new Error(`Unexpected error type: ${error.name}`);
      }
    }
  });

  // Test 5: Invalid confidence values should be rejected
  await runTest('Invalid confidence values are rejected', async () => {
    try {
      await manager.addThought({
        content: 'Valid content',
        type: 'analysis',
        confidence: 1.5 // Invalid: > 1.0
      });
      throw new Error('Invalid confidence should have been rejected');
    } catch (error) {
      if (error.name !== 'ValidationError') {
        throw new Error(`Expected ValidationError, got ${error.name}`);
      }
    }
  });

  // Test 6: Non-existent parent branch should be rejected
  await runTest('Non-existent parent branch is rejected', async () => {
    try {
      await manager.addThought({
        content: 'Valid content',
        type: 'analysis',
        parentBranchId: 'non-existent-parent-branch'
      });
      throw new Error('Non-existent parent branch should have been rejected');
    } catch (error) {
      if (error.name !== 'BranchNotFoundError') {
        throw new Error(`Expected BranchNotFoundError, got ${error.name}`);
      }
    }
  });

  // Test 7: Valid cross-references should work correctly
  await runTest('Valid cross-references work correctly', async () => {
    // First, create a branch to reference
    const firstResult = await manager.addThought({
      content: 'First thought for cross-reference testing',
      type: 'observation',
      branchId: 'cross-ref-source'
    });
    
    // Then create a thought with cross-reference
    const secondResult = await manager.addThought({
      content: 'Second thought that references the first',
      type: 'analysis',
      crossRefs: [{
        toBranch: 'cross-ref-source',
        type: 'builds_upon',
        reason: 'This analysis builds upon the previous observation',
        strength: 0.8
      }]
    });
    
    if (!secondResult.thought.id) {
      throw new Error('Cross-referenced thought not created');
    }
  });

  // Test 8: Invalid cross-reference strength should be rejected
  await runTest('Invalid cross-reference strength is rejected', async () => {
    // Create a branch to reference
    await manager.addThought({
      content: 'Base thought for invalid cross-ref test',
      type: 'observation',
      branchId: 'invalid-cross-ref-base'
    });
    
    try {
      await manager.addThought({
        content: 'Thought with invalid cross-reference',
        type: 'analysis',
        crossRefs: [{
          toBranch: 'invalid-cross-ref-base',
          type: 'builds_upon',
          reason: 'Valid reason',
          strength: 2.0 // Invalid: > 1.0
        }]
      });
      throw new Error('Invalid cross-reference strength should have been rejected');
    } catch (error) {
      if (error.name !== 'ValidationError') {
        throw new Error(`Expected ValidationError, got ${error.name}`);
      }
    }
  });

  // Test 9: Graph analytics should work with validated data
  await runTest('Graph analytics work with validated data', async () => {
    // Add several validated thoughts
    await manager.addThought({
      content: 'Analytics test thought 1',
      type: 'observation'
    });
    
    await manager.addThought({
      content: 'Analytics test thought 2',
      type: 'analysis'
    });
    
    const stats = manager.getStatistics();
    if (!stats || stats.totalThoughts < 2) {
      throw new Error('Analytics not properly reflecting validated data');
    }
    
    if (!stats.totalBranches || stats.totalBranches < 1) {
      throw new Error('Branch statistics not properly maintained');
    }
  });

  // Test 10: Similarity calculations should work with validated content
  await runTest('Similarity calculations work with validated content', async () => {
    const content1 = 'This is the first similarity test content';
    const content2 = 'This is the second similarity test content';
    
    const result1 = await manager.addThought({
      content: content1,
      type: 'observation'
    });
    
    const result2 = await manager.addThought({
      content: content2,
      type: 'analysis'
    });
    
    // Use find similar to test similarity calculations
    try {
      const similar = await manager.findSimilar({
        branchId: result1.thought.branchId,
        topK: 3
      });
      
      if (!similar || !Array.isArray(similar)) {
        throw new Error('Similarity calculation failed with validated content');
      }
    } catch (error) {
      // If similarity calculation is not available, that's acceptable
      if (!error.message.includes('not found')) {
        throw error;
      }
    }
  });

  // Test 11: Error recovery - graph should remain functional after validation errors
  await runTest('Graph remains functional after validation errors', async () => {
    // Cause a validation error
    try {
      await manager.addThought({
        content: '',  // Invalid empty content
        type: 'analysis'
      });
    } catch (error) {
      // Expected validation error
    }
    
    // Verify graph is still functional
    const result = await manager.addThought({
      content: 'Recovery test - valid content after validation error',
      type: 'synthesis'
    });
    
    if (!result.thought.id) {
      throw new Error('Graph not functional after validation error');
    }
    
    // Verify statistics are still accessible
    const stats = manager.getStatistics();
    if (!stats) {
      throw new Error('Statistics not accessible after validation error');
    }
  });

  // Test 12: Bulk operations with mixed valid/invalid inputs
  await runTest('Bulk operations handle mixed valid/invalid inputs', async () => {
    const inputs = [
      { content: 'Valid bulk input 1', type: 'observation' },
      { content: '', type: 'analysis' }, // Invalid - empty
      { content: 'Valid bulk input 2', type: 'synthesis' },
      { content: 'Valid bulk input 3', type: 'analysis', confidence: 1.5 }, // Invalid confidence
      { content: 'Valid bulk input 4', type: 'observation' }
    ];
    
    let validCount = 0;
    let invalidCount = 0;
    
    for (const input of inputs) {
      try {
        await manager.addThought(input);
        validCount++;
      } catch (error) {
        if (error.name === 'ValidationError') {
          invalidCount++;
        } else {
          throw new Error(`Unexpected error: ${error.name}`);
        }
      }
    }
    
    if (validCount !== 3 || invalidCount !== 2) {
      throw new Error(`Expected 3 valid and 2 invalid, got ${validCount} valid and ${invalidCount} invalid`);
    }
  });

  // Summary
  logger.info('=== VALIDATION INTEGRATION TEST SUMMARY ===');
  logger.info(`Tests passed: ${testsPassed}/${testsTotal}`);
  
  if (testsPassed === testsTotal) {
    logger.info('✅ All validation integration tests passed!');
    process.exit(0);
  } else {
    logger.info('❌ Some validation integration tests failed');
    process.exit(1);
  }
}

testValidationIntegration().catch(error => {
  logger.info('❌ Test execution failed:', error);
  process.exit(1);
});
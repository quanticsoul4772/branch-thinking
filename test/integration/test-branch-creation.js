#!/usr/bin/env node

import { BranchManagerAdapter } from '../../dist/branchManagerAdapter.js';
import { logger } from '../utils/logger.js';

async function testBranchCreation() {
  logger.info('Testing branch creation issue\n');
  
  const manager = new BranchManagerAdapter();
  
  // Test 1: Add thought with specific branch ID
  logger.info('=== Test 1: Adding thought with branchId "test-branch-1" ===');
  const result1 = await manager.addThought({
    content: 'This is a test thought',
    type: 'observation',
    branchId: 'test-branch-1'
  });
  logger.info('Result thought branchId:', result1.thought.branchId);
  
  // List all branches
  logger.info('\n=== All branches after test 1 ===');
  const branches1 = manager.getAllBranches();
  branches1.forEach(b => {
    logger.info(`Branch ID: ${b.id}, Thoughts: ${b.thoughts.length}`);
  });
  
  // Test 2: Add another thought to the same branch
  logger.info('\n=== Test 2: Adding another thought to "test-branch-1" ===');
  const result2 = await manager.addThought({
    content: 'This is another test thought',
    type: 'analysis',
    branchId: 'test-branch-1'
  });
  logger.info('Result thought branchId:', result2.thought.branchId);
  
  // List all branches again
  logger.info('\n=== All branches after test 2 ===');
  const branches2 = manager.getAllBranches();
  branches2.forEach(b => {
    logger.info(`Branch ID: ${b.id}, Thoughts: ${b.thoughts.length}`);
  });
  
  // Get specific branch
  logger.info('\n=== Getting branch "test-branch-1" directly ===');
  const testBranch = manager.getBranch('test-branch-1');
  if (testBranch) {
    logger.info('Found branch:', testBranch.id);
    logger.info('Number of thoughts:', testBranch.thoughts.length);
  } else {
    logger.info('Branch "test-branch-1" not found!');
  }
}

testBranchCreation().catch(console.error);

#!/usr/bin/env node

import { BranchManagerAdapter } from './dist/branchManagerAdapter.js';
import { logger } from './utils/logger.js';

async function debugParameterFlow() {
  logger.info('=== Testing parameter flow ===\n');
  
  // Test 1: Direct adapter test
  logger.info('TEST 1: Direct adapter call');
  const adapter = new BranchManagerAdapter();
  const direct1 = await adapter.addThought({
    content: 'Direct adapter test',
    type: 'observation',
    branchId: 'direct-test-1'
  });
  logger.info('Direct result branchId:', direct1.thought.branchId);
  
  // List branches
  logger.info('\n=== Branches after direct test ===');
  adapter.getAllBranches().forEach(b => {
    logger.info(`Branch: ${b.id}, Thoughts: ${b.thoughts.length}`);
  });
}

debugParameterFlow().catch(console.error);

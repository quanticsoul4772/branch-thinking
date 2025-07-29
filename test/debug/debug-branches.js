#!/usr/bin/env node

import { BranchManagerAdapter } from './dist/branchManagerAdapter.js';
import { logger } from './utils/logger.js';

async function debugBranches() {
  logger.info('DEBUG: Testing branch creation\n');
  
  const manager = new BranchManagerAdapter();
  
  // Test 1: Add thoughts with explicit branch IDs
  logger.info('Adding thought 1 to branch "ml-1"...');
  await manager.addThought({
    content: 'Machine learning models require large datasets for training',
    type: 'observation',
    branchId: 'ml-1'
  });
  
  logger.info('Adding thought 2 to branch "ml-1"...');
  await manager.addThought({
    content: 'Neural networks can learn complex patterns through backpropagation',
    type: 'analysis',
    branchId: 'ml-1'
  });
  
  logger.info('\nChecking all branches:');
  const allBranches = manager.getAllBranches();
  allBranches.forEach(branch => {
    logger.info(`Branch ID: ${branch.id}, Thoughts: ${branch.thoughts.length}`);
    branch.thoughts.forEach((thought, idx) => {
      logger.info(`  ${idx + 1}. ${thought.content.substring(0, 50)}...`);
    });
  });
  
  // Test 2: Compare profiles to see branch IDs
  logger.info('\n\nComparing profiles:');
  const comparison = await manager.compareProfiles();
  
  const profilesArray = Array.from(comparison.profiles.entries());
  profilesArray.forEach(([branchId, profile]) => {
    logger.info(`\nBranch "${branchId}":`);
    logger.info(`  Thought Count: ${profile.thoughtCount}`);
    logger.info(`  Keywords: ${profile.keywords.slice(0, 3).join(', ')}`);
  });
}

debugBranches().catch(console.error);

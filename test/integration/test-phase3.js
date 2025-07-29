#!/usr/bin/env node

import { BranchManagerAdapter } from './dist/branchManagerAdapter.js';
import { logger } from './utils/logger.js';

async function testSemanticProfiles() {
  logger.info('Testing Phase 3: Semantic Profiles\n');
  
  const manager = new BranchManagerAdapter();
  
  // Test 1: Create thoughts in branches
  logger.info('=== Creating test branches ===\n');
  
  // ML Branch 1
  logger.info('Creating ML branch 1...');
  await manager.addThought({
    content: 'Machine learning models require large datasets for training',
    type: 'observation',
    branchId: 'ml-1'
  });
  
  await manager.addThought({
    content: 'Neural networks can learn complex patterns through backpropagation',
    type: 'analysis',
    branchId: 'ml-1'
  });
  
  await manager.addThought({
    content: 'Deep learning architectures like transformers have revolutionized NLP',
    type: 'insight',
    branchId: 'ml-1'
  });
  
  // ML Branch 2 (similar theme)
  logger.info('Creating ML branch 2...');
  await manager.addThought({
    content: 'Supervised learning requires labeled training data',
    type: 'observation',
    branchId: 'ml-2'
  });
  
  await manager.addThought({
    content: 'Convolutional neural networks excel at image recognition tasks',
    type: 'analysis',
    branchId: 'ml-2'
  });
  
  await manager.addThought({
    content: 'Training neural networks involves optimizing loss functions',
    type: 'insight',
    branchId: 'ml-2'
  });
  
  // Cooking Branch (different theme)
  logger.info('Creating cooking branch...\n');
  await manager.addThought({
    content: 'Italian cuisine emphasizes fresh ingredients and simple preparation',
    type: 'observation',
    branchId: 'cooking'
  });
  
  await manager.addThought({
    content: 'The Maillard reaction creates complex flavors when proteins and sugars are heated',
    type: 'analysis',
    branchId: 'cooking'
  });
  
  // Test 2: Overlap detection
  logger.info('=== Testing overlap detection ===');
  logger.info('Adding ML thought to cooking branch (should trigger warning)...\n');
  
  const result = await manager.addThought({
    content: 'Gradient descent optimization is fundamental to training neural networks efficiently',
    type: 'analysis',
    branchId: 'cooking'
  });
  
  // Test 3: Compare profiles
  logger.info('\n=== Comparing semantic profiles ===');
  const comparison = await manager.compareProfiles();
  
  logger.info('\nBranch Profiles:');
  const profilesArray = Array.from(comparison.profiles.entries());
  profilesArray.forEach(([branchId, profile]) => {
    logger.info(`\n${branchId}:`);
    logger.info(`  Keywords: ${profile.keywords.slice(0, 5).join(', ')}`);
    logger.info(`  Thought Count: ${profile.thoughtCount}`);
  });
  
  logger.info('\n\nSignificant Overlaps (>60% similarity):');
  if (comparison.overlaps.length > 0) {
    comparison.overlaps.forEach(overlap => {
      logger.info(`  ${overlap.branch1} <-> ${overlap.branch2}: ${(overlap.similarity * 100).toFixed(1)}% similarity`);
    });
  } else {
    logger.info('  No significant overlaps detected');
  }
  
  if (comparison.suggestions.length > 0) {
    logger.info('\n\nAI Suggestions:');
    comparison.suggestions.forEach(suggestion => {
      logger.info(`  - ${suggestion}`);
    });
  }
  
  // Test 4: Drift detection
  logger.info('\n\n=== Testing drift detection ===');
  logger.info('Adding quantum thoughts to ML branch 1...');
  
  await manager.addThought({
    content: 'Quantum computing uses qubits instead of classical bits',
    type: 'observation',
    branchId: 'ml-1'
  });
  
  await manager.addThought({
    content: 'Quantum entanglement allows for instantaneous correlation between particles',
    type: 'analysis',
    branchId: 'ml-1'
  });
  
  await manager.addThought({
    content: 'Quantum supremacy demonstrates computational advantages over classical computers',
    type: 'fact',
    branchId: 'ml-1'
  });
  
  const drift = await manager.detectDrift();
  
  logger.info('\nDrift Analysis:');
  const driftArray = Array.from(drift.driftScores.entries());
  driftArray.forEach(([branchId, driftScore]) => {
    if (driftScore > 0) {
      logger.info(`  ${branchId}: ${(driftScore * 100).toFixed(1)}% drift`);
    }
  });
  
  if (drift.warnings.length > 0) {
    logger.info('\nDrift Warnings:');
    drift.warnings.forEach(warning => {
      logger.info(`  - ${warning.description}`);
    });
  }
  
  // Final comparison after drift
  logger.info('\n\n=== Final profile comparison ===');
  const finalComparison = await manager.compareProfiles();
  
  logger.info('\nUpdated Overlaps:');
  finalComparison.overlaps.forEach(overlap => {
    logger.info(`  ${overlap.branch1} <-> ${overlap.branch2}: ${(overlap.similarity * 100).toFixed(1)}% similarity`);
  });
  
  // Statistics
  const stats = manager.getReasoningStatistics();
  logger.info('\n\n=== Final Statistics ===');
  logger.info(`Total branches: ${stats.totalBranches}`);
  logger.info(`Total thoughts: ${stats.totalThoughts}`);
  logger.info(`Average thoughts per branch: ${stats.avgThoughtsPerBranch.toFixed(1)}`);
  
  logger.info('\n\nPhase 3 testing complete!');
}

testSemanticProfiles().catch(console.error);

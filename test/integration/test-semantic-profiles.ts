#!/usr/bin/env tsx

/**
 * Test script for Phase 3: Semantic Profiles
 */

import { BranchGraph } from '../../src/branchGraph.js';
import { logger } from '../utils/logger.js';

async function testSemanticProfiles() {
  logger.info('Testing Phase 3: Semantic Profiles\n');
  
  const graph = new BranchGraph();
  
  // Create branches with related content
  logger.info('1. Creating branches with semantic content...');
  
  // Branch 1: Machine Learning
  const mlThoughts = [
    "Neural networks are fundamental to deep learning architectures",
    "Gradient descent optimization is key to training ML models",
    "Backpropagation allows efficient computation of gradients in neural networks",
    "Convolutional layers extract features from spatial data"
  ];
  
  for (const thought of mlThoughts) {
    await graph.addThought({
      content: thought,
      branchId: 'ml-branch',
      type: 'analysis',
      confidence: 0.9
    });
  }
  
  // Branch 2: Deep Learning (overlaps with ML)
  const dlThoughts = [
    "Deep neural networks use multiple hidden layers for representation learning",
    "Transformers revolutionized NLP with attention mechanisms",
    "GANs enable generation of realistic synthetic data",
    "Transfer learning leverages pre-trained neural network models"
  ];
  
  for (const thought of dlThoughts) {
    await graph.addThought({
      content: thought,
      branchId: 'dl-branch',
      type: 'analysis',
      confidence: 0.85
    });
  }
  
  // Branch 3: Statistics (somewhat related)
  const statsThoughts = [
    "Hypothesis testing validates statistical significance of results",
    "Regression analysis models relationships between variables",
    "Bayesian inference updates beliefs with new evidence",
    "Probability distributions describe random phenomena"
  ];
  
  for (const thought of statsThoughts) {
    await graph.addThought({
      content: thought,
      branchId: 'stats-branch',
      type: 'analysis',
      confidence: 0.8
    });
  }
  
  // Branch 4: Unrelated topic
  const cookingThoughts = [
    "Sous vide cooking provides precise temperature control",
    "Maillard reaction creates complex flavors through browning",
    "Fermentation preserves food and develops unique tastes",
    "Knife skills are fundamental to efficient food preparation"
  ];
  
  for (const thought of cookingThoughts) {
    await graph.addThought({
      content: thought,
      branchId: 'cooking-branch',
      type: 'observation',
      confidence: 0.9
    });
  }
  
  logger.info('✓ Created 4 branches with different semantic content\n');
  
  // Test semantic overlap detection
  logger.info('2. Testing semantic overlap detection...');
  const newThought = "Recurrent neural networks process sequential data using hidden states";
  
  const result = await graph.addThought({
    content: newThought,
    branchId: 'new-branch',
    type: 'hypothesis',
    confidence: 0.95
  });
  
  if (result.overlapWarning) {
    logger.info('✓ Overlap detected!');
    logger.info(`  - Most similar branch: ${result.overlapWarning.suggestedBranch}`);
    logger.info(`  - Similarity: ${(result.overlapWarning.similarity * 100).toFixed(1)}%\n`);
  }
  
  // Test compareProfiles command
  logger.info('3. Comparing semantic profiles...');
  const profileComparison = await graph.compareProfiles();
  
  logger.info('Branch profiles:');
  for (const [branchId, profile] of profileComparison.profiles) {
    logger.info(`  ${branchId}:`);
    logger.info(`    - Keywords: ${profile.keywords.slice(0, 5).join(', ')}`);
    logger.info(`    - Thoughts: ${profile.thoughtCount}`);
  }
  
  logger.info('\nSignificant overlaps:');
  for (const overlap of profileComparison.overlaps) {
    logger.info(`  ${overlap.branch1} ↔ ${overlap.branch2}: ${(overlap.similarity * 100).toFixed(1)}%`);
  }
  
  if (profileComparison.suggestions.length > 0) {
    logger.info('\nSuggestions:');
    for (const suggestion of profileComparison.suggestions) {
      logger.info(`  - ${suggestion}`);
    }
  }
  
  // Test suggestMerges
  logger.info('\n4. Testing merge suggestions...');
  const merges = await graph.suggestMerges();
  
  if (merges.suggestions.length > 0) {
    logger.info('Merge suggestions:');
    for (const merge of merges.suggestions) {
      logger.info(`  ${merge.branch1} + ${merge.branch2}:`);
      logger.info(`    - Similarity: ${(merge.similarity * 100).toFixed(1)}%`);
      logger.info(`    - Shared keywords: ${merge.sharedKeywords.join(', ')}`);
    }
  } else {
    logger.info('No branches similar enough to suggest merging');
  }
  
  // Test drift detection
  logger.info('\n5. Testing drift detection...');
  
  // Add some drifting thoughts to ML branch
  const driftingThoughts = [
    "Quantum computing could revolutionize cryptography",
    "Blockchain technology ensures distributed consensus",
    "Cloud infrastructure scales compute resources dynamically"
  ];
  
  for (const thought of driftingThoughts) {
    await graph.addThought({
      content: thought,
      branchId: 'ml-branch',
      type: 'observation',
      confidence: 0.7
    });
  }
  
  const driftResults = await graph.detectDrift();
  
  logger.info('Drift analysis:');
  for (const [branchId, drift] of driftResults.driftScores) {
    logger.info(`  ${branchId}: ${(drift * 100).toFixed(1)}% drift`);
  }
  
  if (driftResults.warnings.length > 0) {
    logger.info('\nDrift warnings:');
    for (const warning of driftResults.warnings) {
      logger.info(`  ⚠ ${warning.description}`);
    }
  }
  
  logger.info('\n✅ Phase 3 tests completed successfully!');
}

// Run tests
testSemanticProfiles().catch(console.error);

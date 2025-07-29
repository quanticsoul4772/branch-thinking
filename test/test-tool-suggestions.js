#!/usr/bin/env node

import { BranchManager } from '../dist/branchManager.js';
import { logger } from './utils/logger.js';

logger.info('Testing Tool Suggestions Feature\n');

const manager = new BranchManager();

// Set a goal
manager.setGoal('Debug and fix security issues in authentication code');

// Create branches with different content to trigger different tool suggestions

// Branch 1: Code analysis scenario
manager.addThought({
  content: 'I need to analyze this authentication code for security vulnerabilities. The login function seems to have some SQL injection risks.',
  type: 'analysis',
  branchId: 'security-analysis',
  confidence: 0.8,
  keyPoints: ['security', 'authentication', 'SQL injection', 'vulnerabilities']
});

// Branch 2: File search scenario  
manager.addThought({
  content: 'Looking for all files containing the checkout process. Need to search through the codebase for payment related functions.',
  type: 'investigation',
  branchId: 'file-search',
  confidence: 0.7,
  keyPoints: ['search', 'files', 'checkout', 'payment']
});

// Branch 3: Documentation scenario
manager.addThought({
  content: 'The API endpoints need proper documentation. We should generate docs for the REST API and create diagrams showing the architecture.',
  type: 'planning',
  branchId: 'documentation',
  confidence: 0.9,
  keyPoints: ['API', 'documentation', 'diagrams', 'architecture']
});

// Branch 4: Memory/knowledge scenario
manager.addThought({
  content: 'Need to recall what we discussed about the user authentication patterns last week. Also need to search our knowledge base for OAuth implementation.',
  type: 'recall',
  branchId: 'memory-search',
  confidence: 0.6,
  keyPoints: ['recall', 'patterns', 'knowledge', 'OAuth']
});

// Test tool suggestions for each branch
logger.info('Testing tool suggestions for each branch:\n');

const branches = ['security-analysis', 'file-search', 'documentation', 'memory-search'];

branches.forEach(branchId => {
  const suggestions = manager.suggestTools(branchId);
  const branch = manager.getBranch(branchId);
  
  logger.info(`Branch: ${branchId}`);
  logger.info(`Content: ${branch?.thoughts[0]?.content.slice(0, 80)}...`);
  logger.info(`Suggested tools (${suggestions?.length || 0}):`);
  
  if (suggestions && suggestions.length > 0) {
    suggestions.forEach(tool => {
      logger.info(`  - ${tool.name}: ${tool.reason} (confidence: ${tool.confidence})`);
    });
  } else {
    logger.info('  No specific tools suggested');
  }
  logger.info('');
});

// Test with active branch switching
logger.info('\nTesting with active branch (no branchId specified):');
manager.setActiveBranch('documentation');
const activeSuggestions = manager.suggestTools();
logger.info(`Active branch suggestions: ${activeSuggestions?.length || 0} tools`);
activeSuggestions?.forEach(tool => {
  logger.info(`  - ${tool.name}: ${tool.reason}`);
});

logger.info('\nTest completed!');
#!/usr/bin/env node

import { BranchingThoughtServer } from './dist/index.js';
import { logger } from './utils/logger.js';

async function testMCPInterface() {
  logger.info('Testing MCP interface with branch-thinking tool\n');
  
  const server = new BranchingThoughtServer();
  
  // Simulate MCP tool call with branchId
  logger.info('=== Test 1: MCP call with branchId ===');
  const input1 = {
    content: 'Testing thought via MCP interface',
    type: 'observation',
    branchId: 'mcp-test-branch'
  };
  
  const result1 = await server.processThought(input1);
  const response1 = JSON.parse(result1.content[0].text);
  logger.info('Response:', response1);
  
  // Test 2: Add another thought to same branch
  logger.info('\n=== Test 2: Another thought to same branch ===');
  const input2 = {
    content: 'Another thought via MCP interface',
    type: 'analysis',
    branchId: 'mcp-test-branch'
  };
  
  const result2 = await server.processThought(input2);
  const response2 = JSON.parse(result2.content[0].text);
  logger.info('Response:', response2);
  
  // List branches
  logger.info('\n=== Test 3: List branches command ===');
  const listCommand = {
    command: {
      type: 'list'
    }
  };
  
  const result3 = await server.processThought(listCommand);
  logger.info('Branches:', result3.content[0].text);
}

testMCPInterface().catch(console.error);

#!/usr/bin/env node

// This mimics exactly how the MCP server would receive and process a tool call
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { logger } from './utils/logger.js';

// Simulate the exact structure of an MCP tool request
const mockRequest = {
  params: {
    name: "branch-thinking",
    arguments: {
      content: "Test thought from mock MCP request",
      type: "observation",
      branchId: "mock-branch-id"
    }
  }
};

logger.info("Mock MCP Request:");
logger.info(JSON.stringify(mockRequest, null, 2));

// The issue might be in how the arguments are being passed
// Let's see what the actual structure should be
logger.info("\nArguments being passed:");
logger.info(JSON.stringify(mockRequest.params.arguments, null, 2));

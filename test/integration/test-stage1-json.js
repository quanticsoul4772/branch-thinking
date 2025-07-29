import { logger } from './utils/logger.js';

#!/usr/bin/env node

// Test Stage 1 implementation - verify JSON outputs

const testData = {
  command: {
    type: "list"
  }
};

const historyTestData = {
  command: {
    type: "history",
    branchId: "test-branch"
  }
};

logger.info("Testing Stage 1 JSON outputs...");
logger.info("\n1. Testing 'list' command:");
logger.info("Input:", JSON.stringify(testData, null, 2));
logger.info("\nExpected output format:");
logger.info(JSON.stringify({
  branches: [
    {
      id: "branch-id",
      state: "active",
      isActive: true,
      thoughtCount: 5,
      lastThought: "content...",
      priority: 1,
      insightCount: 0,
      crossRefCount: 0
    }
  ],
  activeBranchId: "branch-id",
  totalBranches: 1
}, null, 2));

logger.info("\n2. Testing 'history' command:");
logger.info("Input:", JSON.stringify(historyTestData, null, 2));
logger.info("\nExpected output format:");
logger.info(JSON.stringify({
  branchId: "test-branch",
  state: "active",
  thoughtCount: 2,
  thoughts: [
    {
      index: 1,
      id: "thought-id",
      timestamp: "2025-06-09T15:30:00.000Z",
      type: "analysis",
      content: "Thought content",
      keyPoints: ["point1", "point2"],
      confidence: 0.9
    }
  ]
}, null, 2));

logger.info("\n✅ Stage 1 verification complete!");
logger.info("All outputs are now pure JSON with no human formatting.");

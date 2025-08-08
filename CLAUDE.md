# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Build the TypeScript project
npm run build

# Watch mode for development
npm run watch

# Run tests (located in test/ directory)
node test/integration/test-mcp-interface.js
node test/integration/test-branch-creation.js
node test/integration/test-semantic-profiles.ts
```

## Architecture Overview

This is a Model Context Protocol (MCP) server that implements multi-path reasoning with semantic analysis. The system is built around a graph-based architecture optimized for performance and semantic understanding.

### Core Architecture Components

1. **MCP Interface Layer** (`src/index.ts`, `src/branchManagerAdapter.ts`)
   - Handles JSON-RPC protocol communication
   - CRITICAL: Suppresses stdout output before imports to prevent protocol corruption
   - Routes commands through CommandHandler

2. **Graph Storage** (`src/branchGraph.ts`)
   - Content-addressed storage using SHA256 hashing
   - O(1) operations for thought creation and retrieval
   - Event sourcing for incremental updates
   - Automatic deduplication of identical thoughts

3. **Evaluation System** (`src/differentialEvaluator.ts`)
   - Processes only events since last evaluation (differential approach)
   - Sliding window comparisons (last 5 thoughts)
   - Multiple cache layers for performance optimization
   - Weighted averaging for branch scoring

4. **Detection Systems**
   - **Bloom Filters** (`src/bloomFilter.ts`): O(1) contradiction detection
   - **Sparse Matrix** (`src/sparseMatrix.ts`): Efficient similarity storage
   - **Circular Reasoning** (`src/circularReasoningDetector.ts`): Logical loop identification

5. **Semantic Layer**
   - **Embe
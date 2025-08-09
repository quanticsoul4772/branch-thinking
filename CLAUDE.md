# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Install dependencies
npm install

# Build the project (required before running)
npm run build

# Development mode with watch
npm run dev         # Uses tsup with watch mode
npm run watch       # Uses tsc with watch mode

# Type checking
npm run typecheck

# Linting
npm run lint        # Check for linting issues (max warnings: 0)
npm run lint:fix    # Auto-fix linting issues

# Testing
npm test                    # Run vitest tests
npm run test:ui            # Run tests with UI interface
npm run test:coverage      # Run tests with coverage report
npm run test:run           # Run tests once (no watch)
npm run test:integration   # Run integration tests

# Run a single test file
npx vitest run src/test/unit/branchGraph.test.ts

# Publishing
npm run prepublishOnly     # Builds before publishing
```

## Architecture Overview

This is a Model Context Protocol (MCP) server implementing multi-path reasoning with semantic analysis. The system uses a graph-based architecture optimized for performance and semantic understanding.

### Critical Implementation Details

1. **MCP Protocol Isolation** (`src/index.ts`)
   - **CRITICAL**: Must suppress ALL stdout output before ANY imports to prevent protocol corruption
   - Only JSON-RPC messages with `"jsonrpc": "2.0"` are allowed on stdout
   - All console methods are silenced or redirected to stderr
   - Environment variables set to suppress library output (TF_CPP_MIN_LOG_LEVEL, TRANSFORMERS_VERBOSITY, etc.)

2. **Core Architecture Flow**
   ```
   MCP Client → index.ts → BranchManagerAdapter → CommandHandler → Commands
                                ↓
                         BranchGraph (Content-addressed storage)
                                ↓
                    DifferentialEvaluator (Incremental evaluation)
   ```

3. **Content-Addressed Storage** (`src/branchGraph.ts`)
   - Uses SHA256 hashing for thought deduplication
   - O(1) operations for thought creation/retrieval
   - Event sourcing pattern for incremental updates
   - Stores thoughts, branches, and cross-references in separate maps

4. **Differential Evaluation System** (`src/differentialEvaluator.ts`)
   - Only processes events since last evaluation (not full recalculation)
   - Sliding window comparisons (last 5 thoughts)
   - Multiple cache layers: similarity cache, term cache, evaluation cache
   - Weighted scoring: coherence (30%), contradiction (20%), information gain (20%), goal alignment (15%), confidence gradient (10%), redundancy (5%)

5. **Performance Optimizations**
   - **Bloom Filters** (`src/bloomFilter.ts`): O(1) contradiction detection with configurable false positive rates
   - **Sparse Matrix** (`src/sparseMatrix.ts`): Only stores similarities above threshold (0.3)
   - **Lazy Loading**: Semantic model loaded only when needed (~1-2s first use)
   - **Batch Operations**: Graph operations batched for efficiency

6. **Command Pattern Implementation** (`src/commands/`)
   - All commands extend abstract `Command` class
   - Commands registered in `CommandHandler` constructor
   - Each command handles validation, execution, and error handling
   - Commands return structured `CommandResult` objects

7. **Semantic Analysis** 
   - Model: Xenova/all-MiniLM-L6-v2 (384-dimensional embeddings)
   - Similarity threshold: 0.3 for storage, 0.7 for semantic navigation
   - Profile-based analysis with concept extraction and weighting

8. **Input Validation** (`src/BranchGraphValidator.ts`)
   - Type-safe validation before graph operations
   - Validates thought types, confidence ranges, cross-reference types
   - Ensures branch states are valid transitions

9. **Error Handling**
   - Custom error classes in `src/utils/customErrors.ts` and `src/utils/structuredErrors.ts`
   - All errors include context and recovery suggestions
   - Validation errors prevent invalid state mutations

10. **Testing Strategy**
    - Unit tests in `src/test/unit/` using Vitest
    - Integration tests in `src/test/integration/`
    - Performance benchmarks in `src/test/benchmark/`
    - Coverage thresholds: 80% for all metrics

## Key Performance Metrics

- Comparisons: 40x reduction (40,000 → 1,000 for 200 thoughts)
- Evaluation speed: 10x faster (500ms → 50ms)
- Memory efficiency: 3x improvement through deduplication
- Response time: <50ms for semantic navigation
- Model loading: ~1-2s on first use (lazy loaded)

## Configuration

- Main config: `src/config.ts` with singleton pattern
- Environment-based overrides supported
- Auto-evaluation thresholds configurable via `configAutoEval` command
- Bloom filter parameters tunable for accuracy vs. memory trade-offs

## Important Patterns

- **Event Sourcing**: All changes tracked as events for incremental processing
- **Content Addressing**: Thoughts identified by content hash, not IDs
- **Sliding Window**: Recent thoughts weighted more heavily in evaluations
- **Differential Updates**: Only changed data processed on evaluation
- **Command Pattern**: All operations routed through command handlers
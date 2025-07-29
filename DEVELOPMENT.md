# Development Documentation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   MCP Interface Layer                     │
│              (BranchManagerAdapter.ts)                    │
├─────────────────────────────────────────────────────────┤
│                  Core Components                          │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────┐ │
│  │ BranchGraph  │  │ Differential   │  │  Command    │ │
│  │   (Graph)    │  │  Evaluator     │  │  Handler    │ │
│  └──────────────┘  └────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────┤
│                 Detection Systems                         │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────┐ │
│  │ Bloom Filter │  │ Sparse Matrix  │  │  Circular   │ │
│  │(Contradiction)│  │  (Similarity)  │  │  Detector   │ │
│  └──────────────┘  └────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────┤
│                 Semantic Layer                            │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────┐ │
│  │  Embeddings  │  │   Navigator    │  │  Profile    │ │
│  │  (MiniLM)    │  │  (Search)      │  │ (Analysis)  │ │
│  └──────────────┘  └────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Key Components

### BranchGraph (Core Storage)
- Content-addressed storage using SHA256 hashes as thought IDs
- Graph adjacency lists for O(1) branch navigation
- Event log for incremental updates
- Inverted index for fast text search

### DifferentialEvaluator (Incremental Processing)
- Processes only events since last evaluation
- Sliding window comparisons (last 5 thoughts)
- Multiple cache layers (similarity, terms, preprocessing)
- Weighted averaging for branch scores

### Detection Systems
- **BloomFilter**: Probabilistic contradiction detection
- **SparseMatrix**: Similarity storage and clustering
- **CircularReasoningDetector**: Logical loop identification

### BranchManagerAdapter (Compatibility Layer)
- Maintains backward compatibility with MCP protocol
- Converts between graph structure and legacy format
- Exposes features through existing commands

## Performance Characteristics

- **Thought Operations**: O(1) creation, O(1) retrieval
- **Evaluation**: O(n) where n = window size (5 thoughts)
- **Contradiction Check**: O(1) using Bloom filters
- **Similarity Search**: O(k) where k = non-zero similarities
- **Memory Usage**: ~50MB model + minimal operational overhead

## Technical Implementation

### Output Suppression for MCP
```typescript
// MUST be before ANY imports
process.env.NODE_ENV = 'production';
process.env.TRANSFORMERS_VERBOSITY = 'error';

// Intercept stdout
process.stdout.write = function(chunk: any, ...) {
  const str = chunk?.toString() || '';
  if (str.includes('"jsonrpc"') && str.includes('"2.0"')) {
    return originalWrite(chunk, ...);
  }
  return true; // Silently discard
};
```

### Content Addressing
- SHA256 hash of thought content creates unique IDs
- Automatic deduplication of identical thoughts
- O(1) lookup by content or ID

### Differential Evaluation
- Only processes events since last evaluation
- Sliding window comparisons (last 5 thoughts)
- Multiple cache layers for performance

### Bloom Filter Configuration
- Positive assertions: 5000 elements, 0.001 FPR
- Negative assertions: 5000 elements, 0.001 FPR
- Concept pairs: 10000 elements, 0.01 FPR

### Sparse Matrix Storage
- Only stores similarities > 0.3 threshold
- 90%+ memory savings over dense matrix
- Enables clustering algorithms

## Code Quality

### Current State (v1.7.1)
- **Quality Score**: 75% (Grade B)
- **Status**: Operational with all issues resolved

### Metrics
- **Deep Nesting**: 165 issues
- **Long Methods**: 66 issues
- **Too Many Parameters**: 38 issues
- **Duplicate Code**: 201 issues

### Key Refactorings
- BranchManagerAdapter: Extracted 30+ methods
- CircularReasoningDetector: Extracted 20+ methods
- Consolidated duplicate evaluator files

## Testing

### Test Coverage Areas
- Unit tests for core components
- Integration tests for MCP protocol
- Performance benchmarks
- Semantic accuracy validation

### Validation Scripts
- JSON output validation
- Semantic similarity accuracy testing
- Performance regression tests

## Contributing Guidelines

### Code Style
- TypeScript strict mode
- Functional programming where appropriate
- Single responsibility principle
- JSDoc comments

### Testing Requirements
- Unit tests for new features
- Integration tests for MCP changes
- Performance benchmarks for optimizations
- Manual testing in Claude Desktop

### Review Process
1. Code quality check (target: 90%)
2. Test coverage verification
3. Performance impact assessment
4. Claude Desktop compatibility test

## Future Development

### Technical Debt
- Reduce deep nesting in core files
- Extract common evaluation logic
- Improve test coverage to 80%+
- Add performance monitoring

### Enhancement Areas
- Pattern recognition for reasoning strategies
- Multi-goal optimization capabilities
- Automated tool orchestration
- Template system for common patterns
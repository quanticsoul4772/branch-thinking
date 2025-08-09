# Branch Thinking Architecture Documentation

## Table of Contents
- [System Overview](#system-overview)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Performance Optimizations](#performance-optimizations)
- [Design Patterns](#design-patterns)
- [Module Dependencies](#module-dependencies)

## System Overview

Branch Thinking is a graph-based reasoning system built on the Model Context Protocol (MCP). It implements multi-path reasoning with semantic analysis, enabling AI systems to explore multiple solution paths simultaneously while detecting contradictions and maintaining coherence.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MCP Client (LLM)                      │
└─────────────────┬───────────────────────────────────────┘
                  │ JSON-RPC
┌─────────────────▼───────────────────────────────────────┐
│                 MCP Server (index.ts)                    │
│  - Protocol handling                                     │
│  - stdout isolation                                      │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│            BranchManagerAdapter                          │
│  - Command routing                                       │
│  - Response formatting                                   │
└────┬──────────────────────────┬─────────────────────────┘
     │                          │
┌────▼──────────────┐  ┌───────▼─────────────┐
│   CommandHandler   │  │   BranchGraph       │
│  - Command registry│  │  - Graph storage    │
│  - Validation      │  │  - Event sourcing   │
└───────────────────┘  └─────────────────────┘
```

## Core Components

### 1. Protocol Layer (`src/index.ts`)

**Responsibilities:**
- MCP protocol implementation
- stdout isolation to prevent protocol corruption
- Request/response handling

**Critical Implementation:**
```typescript
// MUST suppress stdout before ANY imports
process.stdout.write = function(chunk, encoding, callback) {
  if (chunk?.toString().includes('"jsonrpc"')) {
    return originalWrite(chunk, encoding, callback);
  }
  return true; // Silently discard non-protocol output
}
```

### 2. Branch Graph (`src/branchGraph.ts`)

**Architecture:**
- Content-addressed storage using SHA256 hashing
- Event sourcing for state management
- O(1) thought operations

**Key Data Structures:**
```typescript
class BranchGraph {
  private storage: BranchGraphStorage;      // Core storage
  private search: BranchGraphSearch;        // Search operations
  private analytics: BranchGraphAnalytics;  // Analytics
  private contradictionFilter: BloomFilter; // O(1) contradiction detection
  private similarityMatrix: SparseMatrix;   // Similarity storage
  private circularDetector: CircularReasoningDetector;
}
```

**Storage Model:**
- `thoughts`: Map<thoughtId, ThoughtData>
- `branches`: Map<branchId, BranchNode>
- `events`: Array<ThoughtEvent>

### 3. Differential Evaluator (`src/differentialEvaluator.ts`)

**Design Principles:**
- Incremental evaluation (only process changes)
- Multi-layer caching
- Sliding window analysis

**Evaluation Pipeline:**
```
Events → Filter → Process → Delta → Apply → Cache
```

**Cache Hierarchy:**
1. Similarity cache (LRU, 1000 entries)
2. Term cache (text tokenization)
3. Evaluation cache (branch results)

**Metrics Weighting:**
- Coherence: 30%
- Contradiction: 20%
- Information Gain: 20%
- Goal Alignment: 15%
- Confidence Gradient: 10%
- Redundancy: 5%

### 4. Semantic Analysis System

#### Embedding Manager (`src/analyzers/EmbeddingManager.ts`)
- Model: Xenova/all-MiniLM-L6-v2
- Dimensions: 384
- Lazy loading (~1-2s initialization)

#### Semantic Navigator (`src/semanticNavigator.ts`)
- Semantic search and navigation
- Path finding between concepts
- Thought clustering

#### Semantic Profile Manager (`src/semanticProfile.ts`)
- Branch profiling
- Concept extraction
- Drift detection

### 5. Detection Systems

#### Bloom Filters (`src/bloomFilter.ts`)
- Positive assertions: 5000 elements, 0.001 FPR
- Negative assertions: 5000 elements, 0.001 FPR
- Concept pairs: 10000 elements, 0.01 FPR

#### Sparse Matrix (`src/sparseMatrix.ts`)
- Similarity threshold: 0.3
- Memory efficiency: 90%+ savings
- Clustering support

#### Circular Reasoning Detector (`src/circularReasoningDetector.ts`)
- Dependency graph analysis
- Pattern detection algorithms
- Loop identification

### 6. Command System (`src/commands/`)

**Pattern:** Command Pattern with abstract base class

```typescript
abstract class Command {
  abstract execute(data: CommandData): Promise<CommandResult>;
  abstract get description(): string;
}
```

**Command Categories:**
- Navigation: list, focus, history
- Analysis: evaluate, statistics, findContradictions
- Semantic: findSimilar, jumpToRelated, semanticPath
- Management: setGoal, prune, export/import
- Advanced: generateCounterfactuals, synthesizeDialectical

## Data Flow

### 1. Thought Addition Flow

```
Input → Validation → Hash Generation → Storage → Semantic Update → Event Recording
                                         ↓
                                    Contradiction Check
                                         ↓
                                    Similarity Matrix Update
                                         ↓
                                    Response (with warnings)
```

### 2. Evaluation Flow

```
Request → Get Events Since Last → Filter Relevant → Process Deltas
              ↓
         Cache Check
              ↓
         Apply Deltas to Base
              ↓
         Calculate Metrics
              ↓
         Update Cache → Response
```

### 3. Semantic Search Flow

```
Query → Embedding Generation → Vector Search → Ranking → Filtering → Results
            ↓
       Cache Check
            ↓
       Model Initialization (if needed)
```

## Performance Optimizations

### 1. Content Addressing
- SHA256 hashing prevents duplicate thoughts
- O(1) lookup by content
- Automatic deduplication

### 2. Event Sourcing
- Incremental updates only
- No full graph traversal
- Efficient state reconstruction

### 3. Differential Evaluation
- Process only new events
- Sliding window (last 5 thoughts)
- Cached computations

### 4. Sparse Matrix Storage
- Store only similarities > threshold
- 90%+ memory savings
- Efficient clustering algorithms

### 5. Lazy Loading
- Semantic model loaded on first use
- Batch operations where possible
- Progressive enhancement

## Design Patterns

### 1. Singleton Pattern
Configuration management:
```typescript
class ConfigManager {
  private static instance: BranchThinkingConfig;
  static getInstance(): BranchThinkingConfig {
    if (!this.instance) {
      this.instance = this.loadConfig();
    }
    return this.instance;
  }
}
```

### 2. Command Pattern
All operations through command handlers:
```typescript
class CommandHandler {
  private commands: Map<string, Command>;
  execute(type: string, data: any): Promise<Result> {
    return this.commands.get(type).execute(data);
  }
}
```

### 3. Strategy Pattern
Evaluators with pluggable strategies:
```typescript
interface EvaluationStrategy {
  evaluate(branch: Branch): EvaluationResult;
}
```

### 4. Observer Pattern
Event system for state changes:
```typescript
interface EventListener {
  onThoughtAdded(event: ThoughtEvent): void;
  onBranchCreated(event: BranchEvent): void;
}
```

### 5. Factory Pattern
Command creation:
```typescript
class CommandFactory {
  static create(type: string): Command {
    switch(type) {
      case 'evaluate': return new EvaluateCommand();
      // ...
    }
  }
}
```

## Module Dependencies

### Core Dependencies
```
index.ts
  └── BranchManagerAdapter
      ├── BranchGraph
      │   ├── BranchGraphStorage
      │   ├── BranchGraphSearch
      │   └── BranchGraphAnalytics
      ├── DifferentialEvaluator
      │   └── SemanticSimilarity
      └── CommandHandler
          └── Commands/*
```

### Utility Modules
```
utils/
  ├── logger.ts           - Logging with pino
  ├── errors.ts           - Custom error classes
  ├── FormattingHelper.ts - Output formatting
  └── SerializationHelper.ts - Import/export
```

### Analyzer Modules
```
analyzers/
  ├── EmbeddingManager.ts - Semantic embeddings
  ├── SemanticFlowAnalyzer.ts - Flow analysis
  ├── ContradictionDetector.ts - Contradiction detection
  └── ThoughtCollector.ts - Thought aggregation
```

## Memory Management

### Caching Strategy
1. **LRU Caches**: Similarity computations (1000 entries max)
2. **Term Cache**: Tokenized text (unbounded, cleared on reset)
3. **Evaluation Cache**: Branch evaluations (per-branch)
4. **Embedding Cache**: Model embeddings (managed by transformer library)

### Memory Limits
- Bloom filters: ~1MB per filter
- Sparse matrix: Grows with O(n²) worst case, typically O(n) with sparsity
- Event log: Unbounded (consider periodic exports)

## Concurrency Model

### Async Operations
- Semantic model initialization
- Embedding generation
- Similarity calculations
- Counterfactual generation

### Synchronous Operations
- Graph mutations
- Event recording
- Cache updates
- Validation

## Error Handling Strategy

### Validation Errors
- Input validation at boundaries
- Type-safe interfaces
- Descriptive error messages

### Recovery Mechanisms
- Graceful degradation for semantic features
- Fallback to simple text matching
- Cache invalidation on errors

### Error Propagation
```
Command → Validation → Execution → Error Handling → User Feedback
              ↓            ↓             ↓
          ValidationError  RuntimeError  Suggestions
```

## Security Considerations

### Input Sanitization
- Content length limits (10,000 chars)
- Branch ID validation
- Cross-reference validation

### Resource Protection
- Memory limits on caches
- Computation timeouts
- Rate limiting (client-side)

## Extensibility Points

### Adding New Commands
1. Create command class extending `Command`
2. Register in `CommandHandler`
3. Add to command registry

### Adding New Evaluators
1. Implement evaluation strategy
2. Register with `DifferentialEvaluator`
3. Configure weights in config

### Adding New Analyzers
1. Create analyzer module
2. Integrate with `BranchGraph`
3. Expose through commands

## Performance Metrics

### Benchmarks
| Operation | Time | Memory |
|-----------|------|--------|
| Add Thought | <50ms | O(1) |
| Evaluate Branch (100 thoughts) | 50ms | O(n) |
| Semantic Search (1000 thoughts) | <100ms | O(n log n) |
| Find Contradictions | 100-200ms | O(n²) |
| Export (1000 thoughts) | <500ms | O(n) |

### Optimization Results
- Comparison reduction: 40x (40,000 → 1,000 for 200 thoughts)
- Evaluation speed: 10x improvement
- Memory efficiency: 3x through deduplication
- Cache hit rate: >80% for repeated operations

## Future Architecture Considerations

### Planned Enhancements
1. **Distributed Processing**: Shard graph across workers
2. **Persistent Storage**: Database backend option
3. **Real-time Collaboration**: Multi-user support
4. **Advanced ML Models**: Pluggable model architecture
5. **GraphQL API**: Alternative to MCP interface

### Scalability Path
1. Current: Single-process, in-memory (up to 10K thoughts)
2. Next: Multi-process with shared memory (up to 100K thoughts)
3. Future: Distributed with persistent storage (unlimited)

## Monitoring and Observability

### Metrics Collection
- Event counts and rates
- Cache hit/miss ratios
- Evaluation scores over time
- Memory usage patterns

### Logging Strategy
- Structured logging with pino
- Log levels: ERROR, WARN, INFO, DEBUG
- Performance timing for slow operations

### Debug Tools
- Statistics command for runtime metrics
- Export/import for session analysis
- Graph visualization (planned)
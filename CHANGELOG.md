# Changelog

## [1.7.1] - 2025-06-24

### Fixed
- **JSON Parsing Error**: MCP server was failing with "Unexpected token 'I', "[INFO] Regi"... is not valid JSON"
  - Root cause: @xenova/transformers library outputting to stdout during initialization
  - Solution: Implemented output suppression BEFORE any imports
  - Added environment variables to silence library output
  - Intercepted stdout.write to filter non-JSON-RPC messages
  - Server now starts and works in Claude Desktop

### Improved
- **Code Refactoring**: Structural improvements
  - Refactored BranchManagerAdapter from 1134 to 618 lines (45% reduction)
  - Extracted 7 helper classes for code organization
  - Reduced BloomFilter deep nesting through method extraction
  - Consolidated 6 duplicate evaluator files into single file
  - Current score: 75% (Grade B) with 336 code smells

### Maintenance
- Consolidated documentation from 20+ files to 4 files
- Removed temporary refactoring files and test scripts
- Updated documentation with troubleshooting guide

## [1.7.0] - 2025-06-24

### Added
- **Semantic Navigation**: New navigation capabilities
  - `findSimilar`: Search for thoughts matching a semantic query
  - `jumpToRelated`: Navigate to related thoughts from current position
  - `semanticPath`: Find conceptual path between two thoughts
  - Performance: Caching with <50ms response times
  - Bug fixes: Resolved all TypeScript errors

### Implementation
- SemanticNavigator class for search and pathfinding
- Embedding cache to avoid recomputation
- Dijkstra's algorithm for semantic path finding
- Relationship detection based on branch structure

## [1.6.0] - 2025-06-09

### Added
- **Contextual Redundancy Detection**: Three-tier categorization system
  - Direct Repetition (>0.9 similarity)
  - Circular Reasoning (>0.8 similarity to old thoughts)
  - Elaboration (>0.7 continuous similarity)
  
- **Weighted Scoring System**:
  - Repetition weight: 1.0
  - Circular weight: 0.6
  - Elaboration weight: 0.3

### Changed
- Expanded redundancy detection window from 3 to 5 thoughts
- Lowered redundancy detection threshold from 0.85 to 0.3

## [1.5.0] - 2025-06-08

### Added
- **Semantic Similarity Integration**: Transformer-based embeddings
  - Model: Xenova/all-MiniLM-L6-v2 (384-dimensional embeddings)
  - Lazy initialization to avoid startup delays
  - Singleton pattern for resource efficiency
  - Cosine similarity for semantic comparison

### Fixed
- **Redundancy Calculation Bug**: Fixed issue where redundancy always showed 100%
  - Root cause: Thoughts were compared with future thoughts in the branch
  - Solution: Modified evaluateNewThought to only compare with previous thoughts

### Changed
- All similarity calculations now use semantic embeddings
- Evaluators made async to support transformer model operations

## [1.4.0] - 2025-06-08

### Added
- **Architecture Re-design**: AI-optimized structure
  - Content-addressed storage with SHA256 hashing
  - Graph-based structure with O(1) navigation
  - Event sourcing for incremental updates
  - Differential evaluation

- **Detection Systems**:
  - Bloom Filters: O(1) contradiction pre-checking
  - Sparse Matrix: Memory-efficient similarity calculations
  - Circular Reasoning Detector: Logical loop identification

- **Performance Improvements**:
  - 40x reduction in comparisons
  - 10x faster evaluation
  - 3x memory efficiency

### Changed
- Thought IDs now use content hashes
- Evaluation uses sliding window (last 5 thoughts)

## [1.3.0] - 2025-05-31

### Added
- **Tool Awareness System**: MCP tool suggestions
  - `suggestTools` command analyzes branch content
  - Keyword and pattern-based matching
  - Context-aware recommendations
  - Confidence scoring

## [1.2.0] - 2025-05-31

### Added
- **Auto-Evaluation**: Automatic quality assessment
  - Quality ratings (excellent/good/moderate/poor)
  - Specific issue identification
  - Actionable suggestions
  - Configurable thresholds

## [1.1.0] - 2025-05-30

### Added
- **Evaluation System**: Multi-metric scoring
  - Coherence, contradiction, redundancy metrics
  - Goal alignment tracking
  - Automatic branch state transitions

- **Analysis Commands**:
  - `statistics`: Reasoning metrics
  - `findContradictions`: Conflict detection
  - `detectCircular`: Circular reasoning
  - `prune`: Remove low-scoring branches

## [1.0.0] - 2025-05-30

### Added
- **Persistence Layer**: Memory MCP integration
  - Export/import commands
  - Session state preservation
  - Counter continuity

## [0.1.0] - Initial Version

### Features
- Basic branch management
- Cross-references between branches
- Automatic insight generation
- Branch priority tracking
- Confidence scoring
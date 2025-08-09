# Branch Thinking Development Guide

## Table of Contents
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Adding Features](#adding-features)
- [Code Style](#code-style)
- [Debugging](#debugging)
- [Performance Profiling](#performance-profiling)
- [Contributing](#contributing)

## Development Setup

### Prerequisites

- Node.js 18+ (20 recommended)
- npm 9+
- Git
- TypeScript knowledge
- MCP SDK understanding

### Initial Setup

1. **Clone the repository**
```bash
git clone https://github.com/quanticsoul4772/branch-thinking.git
cd branch-thinking
```

2. **Install dependencies**
```bash
npm install
```

3. **Build the project**
```bash
npm run build
```

4. **Run tests**
```bash
npm test
```

### Development Environment

#### VS Code Setup

Recommended extensions:
- ESLint
- Prettier
- TypeScript and JavaScript
- Vitest Runner

`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

#### Environment Variables

Create `.env` for development:
```bash
# Logging
LOG_LEVEL=debug

# Performance
BT_CACHE_SIZE=2000
BT_MIN_WORD_LENGTH=2

# Auto-evaluation
BT_AUTO_EVAL_ENABLED=true
```

## Project Structure

```
branch-thinking/
├── src/
│   ├── index.ts                 # Entry point, MCP server
│   ├── branchManagerAdapter.ts  # Main adapter layer
│   ├── branchGraph.ts          # Core graph implementation
│   ├── differentialEvaluator.ts # Evaluation engine
│   ├── config.ts               # Configuration management
│   ├── types.ts                # TypeScript types
│   │
│   ├── commands/               # Command implementations
│   │   ├── Command.ts          # Abstract base class
│   │   ├── CommandHandler.ts   # Command registry
│   │   └── *Command.ts         # Individual commands
│   │
│   ├── analyzers/              # Analysis modules
│   │   ├── EmbeddingManager.ts # Semantic embeddings
│   │   ├── SemanticFlowAnalyzer.ts
│   │   └── ContradictionDetector.ts
│   │
│   ├── evaluators/             # Evaluation strategies
│   │   ├── BaseEvaluator.ts
│   │   └── semanticEvaluators.ts
│   │
│   ├── utils/                  # Utility modules
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   └── FormattingHelper.ts
│   │
│   └── test/                   # Test files
│       ├── unit/
│       ├── integration/
│       └── benchmark/
│
├── docs/                       # Documentation
├── scripts/                    # Build/utility scripts
├── dist/                       # Build output
│
├── package.json
├── tsconfig.json              # TypeScript config
├── vitest.config.ts           # Test config
├── eslint.config.js           # Linting config
└── tsup.config.ts             # Build config
```

## Development Workflow

### 1. Running in Development Mode

```bash
# Watch mode with automatic rebuilds
npm run dev

# Or with TypeScript compiler watch
npm run watch
```

### 2. Testing During Development

```bash
# Run tests in watch mode
npm test

# Run with UI
npm run test:ui

# Run specific test file
npx vitest run src/test/unit/branchGraph.test.ts

# Run with coverage
npm run test:coverage
```

### 3. Type Checking

```bash
# Check types without building
npm run typecheck
```

### 4. Linting

```bash
# Check for linting issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

### 5. Local Testing with Claude Desktop

Update Claude Desktop config:
```json
{
  "mcpServers": {
    "branch-thinking-dev": {
      "command": "node",
      "args": ["/path/to/your/branch-thinking/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop after building.

## Testing

### Test Structure

```typescript
// src/test/unit/branchGraph.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { BranchGraph } from '../../branchGraph';

describe('BranchGraph', () => {
  let graph: BranchGraph;
  
  beforeEach(() => {
    graph = new BranchGraph();
  });
  
  describe('addThought', () => {
    it('should add thought to graph', async () => {
      const result = await graph.addThought({
        content: 'Test thought',
        type: 'analysis'
      });
      
      expect(result.thoughtId).toBeDefined();
      expect(graph.getThought(result.thoughtId)).toBeDefined();
    });
  });
});
```

### Test Categories

#### Unit Tests (`src/test/unit/`)
- Test individual functions/classes
- Mock dependencies
- Fast execution
- High coverage

#### Integration Tests (`src/test/integration/`)
- Test component interactions
- Real dependencies
- MCP protocol testing
- End-to-end workflows

#### Benchmark Tests (`src/test/benchmark/`)
- Performance testing
- Memory usage
- Scalability tests

### Running Specific Test Suites

```bash
# Unit tests only
npx vitest run src/test/unit

# Integration tests
npx vitest run src/test/integration

# Benchmarks
npx vitest run src/test/benchmark
```

## Adding Features

### 1. Adding a New Command

Create command file:
```typescript
// src/commands/MyNewCommand.ts
import { Command, CommandData, CommandResult } from './Command';
import { BranchManagerAdapter } from '../branchManagerAdapter';

export class MyNewCommand extends Command {
  constructor(private branchManager: BranchManagerAdapter) {
    super();
  }
  
  get description(): string {
    return 'Description of what this command does';
  }
  
  async execute(data: CommandData): Promise<CommandResult> {
    // Implementation
    const result = await this.branchManager.someMethod(data);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }
}
```

Register in CommandHandler:
```typescript
// src/commands/CommandHandler.ts
import { MyNewCommand } from './MyNewCommand';

private registerCommands(): void {
  // ... existing commands
  this.commands.set('myNew', new MyNewCommand(this.branchManager));
}
```

Add tests:
```typescript
// src/test/unit/commands/MyNewCommand.test.ts
describe('MyNewCommand', () => {
  it('should execute correctly', async () => {
    // Test implementation
  });
});
```

### 2. Adding a New Analyzer

Create analyzer:
```typescript
// src/analyzers/MyAnalyzer.ts
export class MyAnalyzer {
  analyze(data: AnalysisInput): AnalysisResult {
    // Implementation
  }
}
```

Integrate with BranchGraph:
```typescript
// src/branchGraph.ts
private myAnalyzer = new MyAnalyzer();

public runMyAnalysis(): AnalysisResult {
  return this.myAnalyzer.analyze(this.getData());
}
```

### 3. Adding Configuration Options

Update config interface:
```typescript
// src/config.ts
export interface BranchThinkingConfig {
  // ... existing config
  myFeature: {
    enabled: boolean;
    threshold: number;
  };
}
```

Add defaults:
```typescript
export const DEFAULT_CONFIG: BranchThinkingConfig = {
  // ... existing defaults
  myFeature: {
    enabled: false,
    threshold: 0.5
  }
};
```

## Code Style

### TypeScript Guidelines

1. **Strict Mode**: Always use strict TypeScript settings
2. **Type Safety**: Avoid `any`, use proper types
3. **Interfaces**: Define interfaces for complex objects
4. **Enums**: Use enums for fixed sets of values
5. **Optional Chaining**: Use `?.` for nullable access
6. **Nullish Coalescing**: Use `??` for defaults

### Naming Conventions

- **Files**: camelCase (`branchGraph.ts`)
- **Classes**: PascalCase (`BranchGraph`)
- **Interfaces**: PascalCase with 'I' prefix optional (`ThoughtData`)
- **Functions**: camelCase (`addThought`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_CONFIG`)
- **Private members**: prefix with underscore (`_privateMethod`)

### Code Organization

```typescript
// 1. Imports (grouped and ordered)
import { external } from 'package';
import { local } from './local';

// 2. Type definitions
interface MyInterface {
  // ...
}

// 3. Constants
const MY_CONSTANT = 42;

// 4. Class definition
export class MyClass {
  // 4a. Properties
  private property: string;
  
  // 4b. Constructor
  constructor() {
    // ...
  }
  
  // 4c. Public methods
  public publicMethod(): void {
    // ...
  }
  
  // 4d. Private methods
  private privateMethod(): void {
    // ...
  }
}

// 5. Helper functions
function helperFunction(): void {
  // ...
}
```

### Documentation

Use JSDoc for public APIs:
```typescript
/**
 * Adds a thought to the graph
 * @param input - The thought input parameters
 * @returns Result containing thought ID and any warnings
 * @throws {ValidationError} If input is invalid
 */
async addThought(input: BranchingThoughtInput): Promise<AddThoughtResult> {
  // ...
}
```

## Debugging

### 1. Logging

Use the logger utility:
```typescript
import { logger } from './utils/logger';

logger.debug('Detailed debug info', { data });
logger.info('General information');
logger.warn('Warning message');
logger.error('Error occurred', error);
```

Set log level:
```bash
LOG_LEVEL=debug npm run dev
```

### 2. Debugging MCP Protocol

Monitor stdout:
```bash
# Run server directly and pipe output
node dist/index.js 2>/dev/null | jq '.'
```

Test with mock client:
```javascript
// scripts/test-mcp.js
const server = spawn('node', ['dist/index.js']);
server.stdout.on('data', (data) => {
  console.log('Response:', JSON.parse(data));
});

// Send test request
server.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  method: 'tools/call',
  params: {
    name: 'branch-thinking',
    arguments: {
      content: 'Test thought',
      type: 'analysis'
    }
  },
  id: 1
}));
```

### 3. VS Code Debugging

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "program": "${workspaceFolder}/dist/index.js",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "sourceMaps": true
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run", "${file}"],
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

## Performance Profiling

### 1. CPU Profiling

```typescript
// Add profiling code
import { performance } from 'perf_hooks';

const start = performance.now();
// ... operation
const end = performance.now();
logger.debug(`Operation took ${end - start}ms`);
```

### 2. Memory Profiling

```typescript
// Monitor memory usage
function logMemoryUsage(label: string): void {
  const usage = process.memoryUsage();
  logger.debug(`Memory [${label}]:`, {
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heap: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`
  });
}
```

### 3. Benchmark Tests

```typescript
// src/test/benchmark/operation.benchmark.ts
import { bench, describe } from 'vitest';

describe('Operation Benchmarks', () => {
  bench('addThought', async () => {
    await graph.addThought({
      content: 'Benchmark thought',
      type: 'analysis'
    });
  });
});
```

Run benchmarks:
```bash
npx vitest bench
```

## Contributing

### 1. Fork and Clone

```bash
# Fork on GitHub, then:
git clone https://github.com/YOUR_USERNAME/branch-thinking.git
cd branch-thinking
git remote add upstream https://github.com/quanticsoul4772/branch-thinking.git
```

### 2. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 3. Make Changes

- Write code
- Add tests
- Update documentation
- Run tests and linting

### 4. Commit Guidelines

Follow conventional commits:
```bash
# Format: <type>(<scope>): <subject>

git commit -m "feat(commands): add new analysis command"
git commit -m "fix(evaluator): correct confidence calculation"
git commit -m "docs: update API reference"
git commit -m "test: add unit tests for semantic navigator"
git commit -m "perf: optimize similarity calculations"
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style
- `refactor`: Refactoring
- `perf`: Performance
- `test`: Testing
- `chore`: Maintenance

### 5. Push and PR

```bash
git push origin feature/your-feature-name
```

Create PR on GitHub with:
- Clear description
- Link to related issues
- Test results
- Screenshots if applicable

### 6. Code Review

Address feedback:
```bash
# Make requested changes
git add .
git commit -m "address review feedback"
git push origin feature/your-feature-name
```

## Troubleshooting Development Issues

### Common Issues

#### TypeScript Errors
```bash
# Clear TypeScript cache
rm -rf dist
npm run build
```

#### Test Failures
```bash
# Run single test with verbose output
npx vitest run path/to/test.ts --reporter=verbose
```

#### MCP Protocol Issues
- Check stdout isn't polluted
- Verify JSON-RPC format
- Check error responses

#### Memory Issues
- Reduce cache sizes in config
- Check for memory leaks in tests
- Profile memory usage

### Debug Commands

```bash
# Check for circular dependencies
npx madge --circular src

# Analyze bundle size
npx tsup --analyze

# Check for unused dependencies
npx depcheck

# Update dependencies
npx npm-check-updates -u
```

## Resources

### Internal Documentation
- [API Reference](./API_REFERENCE.md)
- [Architecture](./ARCHITECTURE.md)
- [Tutorial](./TUTORIAL.md)
- [CLAUDE.md](../CLAUDE.md) - AI assistant instructions

### External Resources
- [MCP SDK Documentation](https://modelcontextprotocol.io)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### Community
- [GitHub Issues](https://github.com/quanticsoul4772/branch-thinking/issues)
- [Discussions](https://github.com/quanticsoul4772/branch-thinking/discussions)
- [Discord](#) (Coming soon)

## License

MIT - See [LICENSE](../LICENSE) file
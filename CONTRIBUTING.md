# Contributing to Branch Thinking

Thank you for your interest in contributing to Branch Thinking! This document provides guidelines for contributing to this MCP (Model Context Protocol) server implementation for differential thinking and branch analysis.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Testing Requirements](#testing-requirements)
- [Review Process](#review-process)
- [Architecture Overview](#architecture-overview)
- [Submitting Changes](#submitting-changes)

## Getting Started

Branch Thinking is a sophisticated MCP server that provides differential thinking capabilities through graph-based analysis, semantic similarity detection, and circular reasoning detection. Before contributing, please familiarize yourself with:

- The [README.md](./README.md) for project overview
- The [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed architecture
- The [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues

## Development Setup

1. **Prerequisites**
   - Node.js 18+ 
   - npm or yarn
   - TypeScript knowledge

2. **Installation**
   ```bash
   git clone https://github.com/quanticsoul4772/branch-thinking.git
   cd branch-thinking
   npm install
   ```

3. **Build and Test**
   ```bash
   npm run build
   npm test
   ```

4. **Local Testing**
   - Test with Claude Desktop using MCP configuration
   - Use integration tests in `test/integration/`
   - Validate JSON output format

## Code Style

### TypeScript Guidelines
- **Strict Mode**: Use TypeScript strict mode
- **Functional Programming**: Prefer functional approaches where appropriate
- **Single Responsibility**: Each class/function should have one clear purpose
- **JSDoc Comments**: Document public APIs and complex logic

### Code Organization
- Keep methods focused and under 50 lines when possible
- Extract common logic into utility functions
- Use descriptive variable and function names
- Maintain consistent error handling patterns

### Example Code Style
```typescript
/**
 * Evaluates semantic similarity between thoughts
 * @param thought1 - First thought to compare
 * @param thought2 - Second thought to compare
 * @returns Similarity score between 0 and 1
 */
export function calculateSimilarity(
  thought1: Thought,
  thought2: Thought
): number {
  // Implementation here
}
```

## Testing Requirements

### Test Coverage Areas
All contributions must include appropriate tests:

- **Unit Tests**: For new features and bug fixes
- **Integration Tests**: For MCP protocol changes
- **Performance Tests**: For optimization-related changes
- **Manual Testing**: Verify functionality in Claude Desktop

### Testing Guidelines
- Maintain or improve existing test coverage
- Use descriptive test names that explain the scenario
- Test both success and failure cases
- Include performance benchmarks for core algorithms

### Running Tests
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Test coverage
npm run test:coverage
```

## Review Process

### Quality Standards
Target code quality score: **90%** (currently 75%)

### Review Checklist
1. **Code Quality Check**
   - Reduces technical debt (nesting, method length, parameters)
   - Follows established patterns
   - Includes comprehensive error handling

2. **Test Coverage Verification**
   - New code is properly tested
   - Existing tests still pass
   - Performance impact is measured

3. **Performance Impact Assessment**
   - Memory usage impact documented
   - Performance benchmarks included for core changes
   - No regression in key operations (O(1) thought operations, etc.)

4. **Claude Desktop Compatibility**
   - Manual testing completed
   - MCP protocol compliance maintained
   - JSON output format validated

## Architecture Overview

### Core Components
- **BranchGraph**: Content-addressed storage with O(1) operations
- **DifferentialEvaluator**: Incremental processing with sliding window
- **Detection Systems**: Bloom filters, sparse matrices, circular reasoning detection
- **BranchManagerAdapter**: MCP protocol compatibility layer

### Performance Characteristics
- **Thought Operations**: O(1) creation and retrieval
- **Evaluation**: O(n) where n = window size (5 thoughts)
- **Memory**: ~50MB model + minimal operational overhead

For detailed architecture information, see [DEVELOPMENT.md](./DEVELOPMENT.md).

## Submitting Changes

### Before Submitting
1. Ensure all tests pass
2. Run linting: `npm run lint`
3. Build successfully: `npm run build`
4. Test manually in Claude Desktop
5. Update documentation if needed

### Pull Request Guidelines
- **Title**: Use conventional commits format (feat:, fix:, docs:, etc.)
- **Description**: 
  - Explain the problem being solved
  - Describe the solution approach
  - Include any breaking changes
  - Reference related issues
- **Testing**: Document testing performed
- **Performance**: Include performance impact assessment

### Commit Message Format
```
type(scope): brief description

Longer description explaining the motivation and implementation
details if needed.

Fixes #issue-number
```

### Types
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style improvements
- `refactor`: Code restructuring
- `perf`: Performance improvements
- `test`: Test additions or improvements

## Issue Reporting

### Bug Reports
Use the bug report template and include:
- Environment details (Node.js version, OS, Claude Desktop version)
- Steps to reproduce
- Expected vs actual behavior
- Error logs/messages
- MCP configuration if relevant

### Feature Requests
Use the feature request template and include:
- Problem description
- Proposed solution
- Alternative solutions considered
- Additional context

## Questions and Support

- **Issues**: Use GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub discussions for questions and ideas
- **Documentation**: Check existing documentation first

## License

By contributing to Branch Thinking, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to Branch Thinking! Your contributions help improve differential thinking capabilities for AI systems.
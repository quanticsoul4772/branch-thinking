# Branch Thinking MCP Server - API Reference

## Table of Contents
- [Overview](#overview)
- [Tool Definition](#tool-definition)
- [Input Schemas](#input-schemas)
- [Commands](#commands)
- [Response Formats](#response-formats)
- [Error Handling](#error-handling)

## Overview

Branch Thinking is a Model Context Protocol (MCP) server that provides multi-path reasoning capabilities with semantic analysis, contradiction detection, and persistence features.

### Base Tool

```typescript
{
  name: "branch-thinking",
  description: "Multi-path reasoning tool with semantic analysis",
  inputSchema: {
    type: "object",
    oneOf: [ThoughtInputSchema, CommandInputSchema]
  }
}
```

## Input Schemas

### Thought Input Schema

Used for adding thoughts to the reasoning graph.

```typescript
interface ThoughtInput {
  content: string;           // The thought content (required)
  type: ThoughtType;         // Type of thought
  branchId?: string;         // Target branch (optional)
  confidence?: number;       // Confidence level (0-1)
  keyPoints?: string[];      // Key points/concepts
  parentBranchId?: string;   // Parent branch for new branches
  crossRefs?: CrossReference[]; // Cross-references to other branches
}
```

#### Thought Types
- `analysis` - Breaking down problems
- `hypothesis` - Proposing solutions
- `validation` - Testing assumptions
- `synthesis` - Combining insights
- `observation` - Noting patterns
- `question` - Raising questions
- `answer` - Providing answers
- `example` - Providing examples
- `counterexample` - Providing counterexamples
- `critique` - Critical analysis

#### Cross-Reference Structure
```typescript
interface CrossReference {
  toBranch: string;      // Target branch ID
  type: CrossRefType;    // Relationship type
  reason: string;        // Explanation
  strength: number;      // Connection strength (0-1)
}
```

#### Cross-Reference Types
- `builds_upon` - Extends another branch
- `contradictory` - Opposes another branch
- `complementary` - Supports from different angle
- `alternative` - Different approach

### Command Input Schema

Used for executing commands on the reasoning graph.

```typescript
interface CommandInput {
  command: {
    type: string;        // Command name
    data?: any;          // Command-specific data
  }
}
```

## Commands

### Navigation Commands

#### list
List all branches with their current status.

```json
{"command": {"type": "list"}}
```

**Response:**
```json
{
  "branches": [
    {
      "id": "main",
      "state": "active",
      "thoughtCount": 5,
      "priority": 1.0,
      "confidence": 0.8
    }
  ]
}
```

#### focus
Switch to a specific branch.

```json
{"command": {"type": "focus", "branchId": "branch-1"}}
```

#### history
Get the complete history of a branch.

```json
{"command": {"type": "history", "branchId": "main"}}
```

### Analysis Commands

#### evaluate
Evaluate the quality of a branch.

```json
{"command": {"type": "evaluate"}}
```

**Response:**
```json
{
  "evaluation": {
    "coherenceScore": 0.85,
    "contradictionScore": 0.1,
    "informationGain": 0.7,
    "goalAlignment": 0.6,
    "overallScore": 0.75,
    "quality": "Good",
    "issues": [],
    "suggestions": []
  }
}
```

#### statistics
Get comprehensive statistics about the reasoning session.

```json
{"command": {"type": "statistics"}}
```

#### findContradictions
Detect contradictions across branches.

```json
{"command": {"type": "findContradictions"}}
```

#### detectCircular
Find circular reasoning patterns.

```json
{"command": {"type": "detectCircular"}}
```

#### findStrongestPaths
Identify the most promising reasoning paths.

```json
{"command": {"type": "findStrongestPaths", "data": {"topK": 3}}}
```

### Semantic Commands

#### findSimilar
Find thoughts similar to a query.

```json
{
  "command": {
    "type": "findSimilar",
    "data": {
      "query": "optimization strategies",
      "limit": 5
    }
  }
}
```

#### jumpToRelated
Navigate to related thoughts.

```json
{
  "command": {
    "type": "jumpToRelated",
    "data": {
      "thoughtId": "abc123",
      "limit": 3
    }
  }
}
```

#### semanticPath
Find semantic path between thoughts.

```json
{
  "command": {
    "type": "semanticPath",
    "data": {
      "fromThoughtId": "abc123",
      "toThoughtId": "def456"
    }
  }
}
```

### Goal Management

#### setGoal
Set a goal for the reasoning session.

```json
{
  "command": {
    "type": "setGoal",
    "goal": "Optimize database query performance"
  }
}
```

### Configuration Commands

#### toggleAutoEval
Toggle automatic evaluation.

```json
{"command": {"type": "toggleAutoEval"}}
```

#### configAutoEval
Configure auto-evaluation settings.

```json
{
  "command": {
    "type": "configAutoEval",
    "data": {
      "enabled": true,
      "thresholds": {
        "excellent": 0.85,
        "good": 0.65,
        "moderate": 0.45
      },
      "suggestPivotThreshold": 0.4
    }
  }
}
```

### Advanced Analysis

#### compareProfiles
Compare semantic profiles of branches.

```json
{"command": {"type": "compareProfiles"}}
```

#### suggestMerges
Suggest branches that could be merged.

```json
{"command": {"type": "suggestMerges"}}
```

#### detectDrift
Detect branches drifting from goals.

```json
{"command": {"type": "detectDrift"}}
```

#### generateCounterfactuals
Generate counterfactual scenarios.

```json
{
  "command": {
    "type": "generateCounterfactuals",
    "data": {
      "branchId": "main",
      "count": 3
    }
  }
}
```

#### detectKnowledgeGaps
Identify knowledge gaps in reasoning.

```json
{"command": {"type": "detectKnowledgeGaps"}}
```

#### synthesizeDialectical
Create dialectical synthesis.

```json
{
  "command": {
    "type": "synthesizeDialectical",
    "data": {
      "branches": ["thesis-branch", "antithesis-branch"]
    }
  }
}
```

### Maintenance Commands

#### prune
Remove weak branches.

```json
{
  "command": {
    "type": "prune",
    "data": {
      "threshold": 0.3
    }
  }
}
```

### Persistence Commands

#### export
Export the reasoning session.

```json
{"command": {"type": "export"}}
```

#### import
Import a reasoning session.

```json
{
  "command": {
    "type": "import",
    "data": {/* exported session data */}
  }
}
```

### Tool Integration

#### suggestTools
Get tool suggestions based on context.

```json
{"command": {"type": "suggestTools"}}
```

## Response Formats

### Standard Response

```typescript
interface StandardResponse {
  thoughtId?: string;        // ID of added thought
  branchId: string;          // Current branch
  branchState: string;       // Branch state
  branchPriority: number;    // Branch priority
  numThoughts: number;       // Total thoughts in branch
  activeBranch: string;      // Active branch name
  evaluation?: Evaluation;   // Auto-evaluation results
  overlapWarning?: {         // Semantic overlap warning
    suggestedBranch: string;
    currentSimilarity: number;
    suggestedSimilarity: number;
  };
}
```

### Evaluation Response

```typescript
interface Evaluation {
  score: number;             // Overall score (0-1)
  quality: string;           // Quality rating
  issues: string[];          // Identified issues
  suggestions: string[];     // Improvement suggestions
  shouldPivot?: boolean;     // Pivot recommendation
  pivotReason?: string;      // Reason for pivot
  metrics: {
    coherenceScore: number;
    contradictionScore: number;
    informationGain: number;
    goalAlignment: number;
    confidenceGradient: number;
    redundancyScore: number;
  };
}
```

### Error Response

```typescript
interface ErrorResponse {
  error: string;             // Error message
  status: 'failed';          // Status indicator
  details?: any;             // Additional error details
}
```

## Error Handling

### Common Error Codes

| Error | Description | Resolution |
|-------|-------------|------------|
| `ValidationError` | Invalid input parameters | Check input against schema |
| `BranchNotFoundError` | Referenced branch doesn't exist | Use valid branch ID |
| `ThoughtNotFoundError` | Referenced thought doesn't exist | Use valid thought ID |
| `CircularReferenceError` | Circular dependency detected | Review branch relationships |
| `SemanticModelError` | Semantic model initialization failed | Retry or check resources |

### Error Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "problemField",
    "expected": "expectedValue",
    "received": "actualValue"
  },
  "suggestions": [
    "Try this solution",
    "Or this alternative"
  ]
}
```

## Rate Limits and Performance

### Performance Characteristics

| Operation | Typical Response Time | Complexity |
|-----------|----------------------|------------|
| Add Thought | <50ms | O(1) |
| Evaluate Branch | 50-100ms | O(n) |
| Semantic Search | <100ms | O(n log n) |
| Find Contradictions | 100-200ms | O(n²) |
| Export Session | Variable | O(n) |

### Resource Limits

- Maximum thought content: 10,000 characters
- Maximum branches: Unlimited (practical limit ~1000)
- Maximum thoughts per branch: Unlimited (practical limit ~10,000)
- Semantic model initialization: ~1-2 seconds (first use only)

## Examples

### Complete Reasoning Session

```javascript
// 1. Set a goal
{
  "command": {
    "type": "setGoal",
    "goal": "Design a scalable authentication system"
  }
}

// 2. Add initial analysis
{
  "content": "Breaking down authentication requirements",
  "type": "analysis",
  "keyPoints": ["security", "scalability", "user-experience"]
}

// 3. Create hypothesis branch
{
  "content": "OAuth2 with JWT tokens for stateless auth",
  "type": "hypothesis",
  "branchId": "oauth-solution",
  "confidence": 0.8
}

// 4. Add validation
{
  "content": "JWT tokens enable horizontal scaling",
  "type": "validation",
  "branchId": "oauth-solution",
  "confidence": 0.9
}

// 5. Create alternative
{
  "content": "Session-based auth with Redis",
  "type": "hypothesis",
  "branchId": "session-solution",
  "crossRefs": [{
    "toBranch": "oauth-solution",
    "type": "alternative",
    "reason": "Different state management approach",
    "strength": 0.7
  }]
}

// 6. Evaluate branches
{"command": {"type": "evaluate"}}

// 7. Find strongest paths
{"command": {"type": "findStrongestPaths", "data": {"topK": 2}}}

// 8. Export results
{"command": {"type": "export"}}
```

### Semantic Navigation Example

```javascript
// 1. Add thoughts
{
  "content": "Caching strategies improve performance",
  "type": "observation"
}

// 2. Find similar thoughts
{
  "command": {
    "type": "findSimilar",
    "data": {
      "query": "performance optimization",
      "limit": 5
    }
  }
}

// 3. Jump to related
{
  "command": {
    "type": "jumpToRelated",
    "data": {
      "thoughtId": "abc123",
      "limit": 3
    }
  }
}
```

## Best Practices

1. **Goal Setting**: Always set a clear goal before starting reasoning
2. **Branch Management**: Create new branches for distinct solution paths
3. **Cross-References**: Use cross-references to link related ideas
4. **Regular Evaluation**: Evaluate branches periodically to track quality
5. **Pruning**: Remove weak branches to maintain focus
6. **Semantic Search**: Use semantic search to find related thoughts
7. **Export Sessions**: Export important sessions for persistence

## Version Information

- API Version: 1.0.0
- MCP Protocol: 1.0
- Last Updated: 2024
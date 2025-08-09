# Branch Thinking Tutorial

## Table of Contents
- [Introduction](#introduction)
- [Getting Started](#getting-started)
- [Basic Concepts](#basic-concepts)
- [Tutorial 1: Simple Reasoning Session](#tutorial-1-simple-reasoning-session)
- [Tutorial 2: Multi-Branch Exploration](#tutorial-2-multi-branch-exploration)
- [Tutorial 3: Semantic Navigation](#tutorial-3-semantic-navigation)
- [Tutorial 4: Advanced Analysis](#tutorial-4-advanced-analysis)
- [Best Practices](#best-practices)

## Introduction

Branch Thinking is a powerful reasoning tool that helps AI systems explore multiple solution paths simultaneously. This tutorial will guide you through progressively complex examples to master its capabilities.

## Getting Started

### Installation

```bash
# Global installation
npm install -g branch-thinking-mcp

# Or as a dependency
npm install branch-thinking-mcp
```

### Basic Setup with Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "branch-thinking": {
      "command": "npx",
      "args": ["branch-thinking-mcp"]
    }
  }
}
```

## Basic Concepts

### Thoughts
The fundamental unit of reasoning. Each thought has:
- **Content**: The actual text of the thought
- **Type**: Category (analysis, hypothesis, validation, etc.)
- **Confidence**: How certain you are (0-1)
- **Key Points**: Main concepts covered

### Branches
Parallel reasoning paths. Think of them as different approaches to solving a problem.

### Cross-References
Connections between branches showing relationships (builds upon, contradicts, complements, alternatives).

## Tutorial 1: Simple Reasoning Session

Let's solve a simple problem: "Should I use SQL or NoSQL for my application?"

### Step 1: Set a Goal

```json
{
  "command": {
    "type": "setGoal",
    "goal": "Choose the best database type for a social media application"
  }
}
```

### Step 2: Initial Analysis

```json
{
  "content": "Social media apps need to handle user profiles, posts, comments, likes, and relationships between users",
  "type": "analysis",
  "keyPoints": ["user-data", "relationships", "scalability"]
}
```

### Step 3: Add Considerations

```json
{
  "content": "The relationship data (followers, friends) forms a graph structure",
  "type": "observation",
  "confidence": 0.9
}
```

```json
{
  "content": "We expect high read volume for timeline generation",
  "type": "observation",
  "confidence": 0.8
}
```

### Step 4: Evaluate Current Thinking

```json
{"command": {"type": "evaluate"}}
```

**Expected Response:**
```json
{
  "evaluation": {
    "score": 0.72,
    "quality": "Good",
    "issues": [],
    "suggestions": ["Consider specific database options"]
  }
}
```

### Step 5: Form Hypotheses

```json
{
  "content": "Use PostgreSQL with JSON columns for flexibility",
  "type": "hypothesis",
  "confidence": 0.7,
  "keyPoints": ["sql", "flexible-schema", "json"]
}
```

## Tutorial 2: Multi-Branch Exploration

Now let's explore multiple solutions in parallel.

### Step 1: Create Alternative Branches

```json
{
  "content": "MongoDB for document storage with embedded relationships",
  "type": "hypothesis",
  "branchId": "nosql-solution",
  "confidence": 0.8,
  "keyPoints": ["mongodb", "document-store", "embedded"]
}
```

```json
{
  "content": "Graph database like Neo4j for relationship-heavy queries",
  "type": "hypothesis",
  "branchId": "graph-solution",
  "confidence": 0.85,
  "keyPoints": ["neo4j", "graph", "relationships"]
}
```

### Step 2: Add Supporting Evidence

For the NoSQL branch:
```json
{
  "content": "MongoDB handles horizontal scaling well for large datasets",
  "type": "validation",
  "branchId": "nosql-solution",
  "confidence": 0.9
}
```

For the Graph branch:
```json
{
  "content": "Neo4j excels at friend-of-friend queries and recommendation algorithms",
  "type": "validation",
  "branchId": "graph-solution",
  "confidence": 0.95
}
```

### Step 3: Add Cross-References

```json
{
  "content": "Hybrid approach: Neo4j for relationships, MongoDB for content",
  "type": "synthesis",
  "branchId": "hybrid-solution",
  "crossRefs": [
    {
      "toBranch": "graph-solution",
      "type": "builds_upon",
      "reason": "Uses graph DB strengths",
      "strength": 0.9
    },
    {
      "toBranch": "nosql-solution",
      "type": "complementary",
      "reason": "Combines with document storage",
      "strength": 0.85
    }
  ]
}
```

### Step 4: Compare Branches

```json
{"command": {"type": "list"}}
```

```json
{"command": {"type": "findStrongestPaths", "data": {"topK": 3}}}
```

## Tutorial 3: Semantic Navigation

Explore related thoughts using semantic search.

### Step 1: Build Knowledge Base

```json
{
  "content": "Caching with Redis improves read performance",
  "type": "observation",
  "keyPoints": ["caching", "redis", "performance"]
}
```

```json
{
  "content": "CDN usage reduces latency for media content",
  "type": "observation",
  "keyPoints": ["cdn", "media", "latency"]
}
```

```json
{
  "content": "Database indexing strategies affect query performance",
  "type": "analysis",
  "keyPoints": ["indexing", "query-optimization", "performance"]
}
```

### Step 2: Find Similar Thoughts

```json
{
  "command": {
    "type": "findSimilar",
    "data": {
      "query": "performance optimization techniques",
      "limit": 5
    }
  }
}
```

### Step 3: Navigate Related Concepts

```json
{
  "command": {
    "type": "jumpToRelated",
    "data": {
      "thoughtId": "abc123",  // Use actual thought ID from response
      "limit": 3
    }
  }
}
```

### Step 4: Find Semantic Path

```json
{
  "command": {
    "type": "semanticPath",
    "data": {
      "fromThoughtId": "thought1_id",
      "toThoughtId": "thought2_id"
    }
  }
}
```

## Tutorial 4: Advanced Analysis

### Detecting Contradictions

```json
{
  "content": "NoSQL databases don't support ACID transactions",
  "type": "observation",
  "branchId": "nosql-solution",
  "confidence": 0.3  // Low confidence because this is outdated
}
```

```json
{
  "content": "MongoDB supports multi-document ACID transactions since version 4.0",
  "type": "validation",
  "branchId": "nosql-solution",
  "confidence": 0.95
}
```

```json
{"command": {"type": "findContradictions"}}
```

### Knowledge Gap Detection

```json
{"command": {"type": "detectKnowledgeGaps"}}
```

**Response might show:**
```json
{
  "gaps": [
    {
      "area": "Cost analysis",
      "description": "No thoughts about operational costs",
      "suggestedQuestions": [
        "What are the licensing costs?",
        "What about operational overhead?"
      ]
    }
  ]
}
```

### Counterfactual Generation

```json
{
  "command": {
    "type": "generateCounterfactuals",
    "data": {
      "branchId": "nosql-solution",
      "count": 3
    }
  }
}
```

**Generates scenarios like:**
- "What if the data becomes highly relational?"
- "What if ACID compliance becomes mandatory?"
- "What if we need complex analytical queries?"

### Dialectical Synthesis

```json
{
  "command": {
    "type": "synthesizeDialectical",
    "data": {
      "branches": ["nosql-solution", "graph-solution"]
    }
  }
}
```

## Best Practices

### 1. Goal Setting
Always set a clear, specific goal at the beginning:
- ❌ "Choose a database"
- ✅ "Choose the best database for a social media app with 1M daily active users"

### 2. Thought Types
Use appropriate thought types:
- **analysis**: Breaking down the problem
- **hypothesis**: Proposing solutions
- **validation**: Supporting evidence
- **observation**: Noting important facts
- **synthesis**: Combining insights

### 3. Confidence Scores
Be honest with confidence levels:
- 0.9-1.0: Very certain, well-validated
- 0.7-0.9: Confident but needs validation
- 0.5-0.7: Moderate confidence
- 0.3-0.5: Uncertain, needs investigation
- 0.0-0.3: Speculative

### 4. Branch Management

Create new branches when:
- Exploring fundamentally different approaches
- Testing alternative assumptions
- Investigating edge cases

Keep branches focused:
- Each branch should explore one main idea
- Use cross-references to show relationships
- Prune weak branches regularly

### 5. Regular Evaluation

Evaluate branches periodically:
```json
{"command": {"type": "evaluate"}}
```

Watch for:
- Declining coherence scores
- Rising contradiction rates
- Low information gain
- Poor goal alignment

### 6. Semantic Features

Leverage semantic search:
- Find related thoughts before adding new ones
- Check for overlap with existing branches
- Navigate through concept space

### 7. Export Important Sessions

```json
{"command": {"type": "export"}}
```

Save the exported data for:
- Future reference
- Sharing with team members
- Continuing reasoning later

## Common Patterns

### Pattern 1: Diverge-Converge
1. Start with broad analysis
2. Create multiple hypothesis branches
3. Validate each independently
4. Synthesize findings
5. Converge on best solution

### Pattern 2: Depth-First Exploration
1. Pick most promising branch
2. Explore deeply with validations
3. Hit dead end? Backtrack
4. Try next branch
5. Compare final depths

### Pattern 3: Contradiction Resolution
1. Identify contradictions
2. Examine evidence for each side
3. Add clarifying thoughts
4. Update confidence scores
5. Resolve or document uncertainty

### Pattern 4: Gap-Driven Investigation
1. Detect knowledge gaps
2. Generate questions
3. Add thoughts addressing gaps
4. Re-evaluate completeness
5. Iterate until satisfied

## Troubleshooting

### High Contradiction Scores
- Review recent thoughts for conflicts
- Check confidence levels
- Add clarifying thoughts
- Consider splitting into separate branches

### Low Coherence
- Thoughts may be too diverse
- Add connecting thoughts
- Improve key point tagging
- Consider branch reorganization

### Circular Reasoning Detected
- Review the circular pattern
- Break dependencies
- Add new evidence from outside the loop
- Restructure argument flow

### Poor Goal Alignment
- Revisit and clarify goal
- Prune irrelevant branches
- Add goal-focused thoughts
- Use semantic navigation toward goal

## Advanced Tips

### 1. Thought Chaining
Link thoughts explicitly:
```json
{
  "content": "Building on the previous point about scaling...",
  "type": "analysis",
  "keyPoints": ["scaling", "continuation"]
}
```

### 2. Evidence Weighting
Use confidence to weight evidence:
- Strong evidence: 0.9+ confidence
- Moderate evidence: 0.6-0.9
- Weak evidence: below 0.6

### 3. Branch Profiles
Use semantic profiles to understand branch focus:
```json
{"command": {"type": "compareProfiles"}}
```

### 4. Merge Detection
Find branches that could be combined:
```json
{"command": {"type": "suggestMerges"}}
```

### 5. Drift Monitoring
Detect when branches drift from goals:
```json
{"command": {"type": "detectDrift"}}
```

## Example: Complete Problem-Solving Session

Here's a complete example solving "How to improve website performance?"

```javascript
// 1. Set goal
{"command": {"type": "setGoal", "goal": "Improve e-commerce website load time from 5s to under 2s"}}

// 2. Current state analysis
{"content": "Current load time is 5 seconds, mostly due to large images and synchronous JavaScript", "type": "analysis", "keyPoints": ["performance", "images", "javascript"]}

// 3. Measurement
{"content": "Lighthouse score: Performance 45, FCP 3.2s, LCP 4.8s", "type": "observation", "confidence": 1.0}

// 4. Create solution branches
// Branch 1: Image optimization
{"content": "Implement WebP format with fallbacks", "type": "hypothesis", "branchId": "image-optimization", "confidence": 0.9}
{"content": "Use responsive images with srcset", "type": "hypothesis", "branchId": "image-optimization", "confidence": 0.85}
{"content": "Implement lazy loading for below-fold images", "type": "hypothesis", "branchId": "image-optimization", "confidence": 0.95}

// Branch 2: Code optimization
{"content": "Code split JavaScript bundles", "type": "hypothesis", "branchId": "code-optimization", "confidence": 0.8}
{"content": "Implement tree shaking to remove unused code", "type": "hypothesis", "branchId": "code-optimization", "confidence": 0.75}

// Branch 3: Infrastructure
{"content": "Implement CDN for static assets", "type": "hypothesis", "branchId": "infrastructure", "confidence": 0.9}
{"content": "Enable HTTP/2 and compression", "type": "hypothesis", "branchId": "infrastructure", "confidence": 0.85}

// 5. Validate with evidence
{"content": "WebP reduces image size by 30% on average", "type": "validation", "branchId": "image-optimization", "confidence": 0.95}
{"content": "Code splitting reduced JS bundle from 2MB to 400KB initial", "type": "validation", "branchId": "code-optimization", "confidence": 0.9}

// 6. Synthesize solution
{"content": "Combined approach: CDN + image optimization + code splitting can achieve <2s load time", "type": "synthesis", "branchId": "combined-solution", "crossRefs": [
  {"toBranch": "image-optimization", "type": "builds_upon", "reason": "Incorporates image improvements", "strength": 0.9},
  {"toBranch": "code-optimization", "type": "builds_upon", "reason": "Includes JS optimization", "strength": 0.85},
  {"toBranch": "infrastructure", "type": "builds_upon", "reason": "Uses CDN benefits", "strength": 0.9}
]}

// 7. Evaluate and export
{"command": {"type": "evaluate"}}
{"command": {"type": "findStrongestPaths", "data": {"topK": 3}}}
{"command": {"type": "export"}}
```

## Next Steps

1. **Practice with Real Problems**: Apply to your actual reasoning tasks
2. **Experiment with Commands**: Try all available commands
3. **Build Templates**: Create reusable patterns for common problems
4. **Share Sessions**: Export and share successful reasoning patterns
5. **Contribute**: Share feedback and contribute to the project

## Resources

- [API Reference](./API_REFERENCE.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [Development Guide](./DEVELOPMENT.md)
- [GitHub Repository](https://github.com/quanticsoul4772/branch-thinking)

Happy reasoning! 🎯
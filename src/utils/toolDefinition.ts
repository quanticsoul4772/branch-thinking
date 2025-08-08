import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Create the tool definition for the branching thought tool
 * Extracted to reduce file size and improve maintainability
 */
export function createToolDefinition(): Tool {
  return {
    name: 'branch-thinking',
    description: `A tool for managing multiple branches of thought with insights and cross-references.
    
Each thought can:
- Belong to a specific branch
- Generate insights
- Create cross-references to other branches
- Include confidence scores and key points

The system tracks:
- Branch priorities and states
- Relationships between thoughts
- Accumulated insights
- Cross-branch connections

Commands:
- list: Show all branches and their status
- focus [branchId]: Switch focus to a specific branch
- history [branchId?]: Show the history of thoughts in a branch
- export: Export all branches in a format suitable for memory MCP storage
- import [data]: Import previously exported branch data
- setGoal [goal]: Set a goal for evaluation alignment
- evaluate [branchId?]: Evaluate a branch
- statistics: Get comprehensive reasoning statistics
- findContradictions: Find contradictory branches
- findStrongestPaths [targetConclusion]: Find branches best aligned with a conclusion
- detectCircular: Detect circular reasoning patterns
- prune [threshold?]: Remove low-scoring branches (default: 0.2)
- toggleAutoEval: Toggle auto-evaluation on/off
- configAutoEval [config?]: Configure auto-evaluation settings
- suggestTools [branchId?]: Suggest relevant tools from a2a registry
- compareProfiles: Compare semantic profiles of all branches
- suggestMerges: Find branches with high semantic similarity that could be merged
- detectDrift: Detect branches that have drifted from their semantic center
- generateCounterfactuals [branchId?]: Generate what-if scenarios from a branch
- detectKnowledgeGaps [branchId?]: Identify areas needing additional research
- synthesizeDialectical [branch1Id, branch2Id?]: Create dialectical synthesis between branches
- findSimilar [query, limit?]: Find thoughts similar to a search query
- jumpToRelated [thoughtId, limit?]: Jump to related thoughts from current position
- semanticPath [fromThoughtId, toThoughtId]: Find semantic path between two thoughts`,
    inputSchema: {
      type: 'object',
      anyOf: [
        { required: ['content', 'type'] },
        { required: ['command'] }
      ],
      properties: {
        content: {
          type: 'string',
          description: 'The thought content'
        },
        type: {
          type: 'string',
          description: 'Type of thought (e.g., \'analysis\', \'hypothesis\', \'observation\')'
        },
        branchId: {
          type: 'string',
          description: 'Optional: ID of the branch (generated if not provided)'
        },
        parentBranchId: {
          type: 'string',
          description: 'Optional: ID of the parent branch'
        },
        confidence: {
          type: 'number',
          description: 'Optional: Confidence score (0-1)'
        },
        keyPoints: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional: Key points identified in the thought'
        },
        crossRefs: {
          type: 'array',
          description: 'Optional: Cross-references to other branches',
          items: {
            type: 'object',
            properties: {
              toBranch: { type: 'string' },
              type: { type: 'string' },
              reason: { type: 'string' },
              strength: { type: 'number' }
            }
          }
        },
        command: {
          type: 'object',
          description: 'Optional: Navigation command',
          properties: {
            type: {
              type: 'string',
              enum: [
                'list', 'focus', 'history', 'export', 'import', 'setGoal', 
                'evaluate', 'statistics', 'findContradictions', 'findStrongestPaths', 
                'detectCircular', 'prune', 'toggleAutoEval', 'configAutoEval', 
                'suggestTools', 'compareProfiles', 'suggestMerges', 'detectDrift',
                'generateCounterfactuals', 'detectKnowledgeGaps', 'synthesizeDialectical',
                'findSimilar', 'jumpToRelated', 'semanticPath'
              ],
              description: 'Command type'
            },
            branchId: {
              type: 'string',
              description: 'Branch ID for commands that require it'
            },
            goal: {
              type: 'string',
              description: 'Goal for setGoal command'
            },
            data: {
              type: 'object',
              description: 'Data for import command (entities and relations arrays) or parameters for other commands',
              properties: {
                entities: { type: 'array' },
                relations: { type: 'array' },
                threshold: { type: 'number' },
                limit: { type: 'number' },
                thoughtId: { type: 'string' },
                fromThoughtId: { type: 'string' },
                toThoughtId: { type: 'string' },
                branch1Id: { type: 'string' },
                branch2Id: { type: 'string' }
              }
            },
            query: {
              type: 'string',
              description: 'Query string for findStrongestPaths or findSimilar command'
            }
          },
          required: ['type']
        }
      }
    }
  };
}

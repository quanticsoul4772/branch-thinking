// CRITICAL: Suppress ALL stdout output before ANY imports to prevent MCP protocol corruption
// This MUST be the first code that runs

// Set environment variables to suppress library output
process.env.NODE_ENV = 'production';
process.env.TF_CPP_MIN_LOG_LEVEL = '3';
process.env.TRANSFORMERS_VERBOSITY = 'error';
process.env.HF_HUB_VERBOSITY = 'error';
process.env.TOKENIZERS_PARALLELISM = 'false';

const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleDebug = console.debug;
const originalConsoleError = console.error;

// Completely silence stdout except for JSON-RPC messages
process.stdout.write = function(chunk: any, encoding?: any, callback?: any): boolean {
  const str = chunk?.toString() || '';
  // Only allow properly formatted JSON-RPC messages
  if (str.trim() && str.includes('"jsonrpc"') && str.includes('"2.0"')) {
    return originalStdoutWrite(chunk, encoding, callback);
  }
  // Silently discard everything else
  if (callback) {
    callback();
  }
  return true;
} as any;

// Redirect ALL console methods to stderr or silence them
console.log = () => {};
console.info = () => {};
console.warn = () => {};
console.debug = () => {};
console.error = (...args: any[]) => {
  // Only log actual errors to stderr for debugging
  if (args.some(arg => arg instanceof Error)) {
    process.stderr.write(`[ERROR] ${args.join(' ')}\n`);
  }
};

// Now safe to import - any console output will be suppressed
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { BranchManagerAdapter } from './branchManagerAdapter.js';
import { BranchingThoughtInput } from './types.js';
import { CommandHandler } from './commands/CommandHandler.js';
import { createToolDefinition } from './utils/toolDefinition.js';

class BranchingThoughtServer {
  private branchManager = new BranchManagerAdapter();
  private commandHandler: CommandHandler;

  constructor() {
    this.commandHandler = new CommandHandler(this.branchManager);
  }

  private getScoreInterpretation(score: number): string {
    if (score > 0.8) {
      return 'Excellent reasoning path';
    }
    if (score > 0.6) {
      return 'Good reasoning, some improvements possible';
    }
    if (score > 0.4) {
      return 'Moderate quality, significant issues';
    }
    return 'Poor reasoning, consider abandoning';
  }

  private collectIssues(evaluation: any): string[] {
    const issues = [];
    const { coherenceScore, contradictionScore, redundancyScore, informationGain, goalAlignment } = evaluation;
    
    if (coherenceScore < 0.5) {
      issues.push('low coherence');
    }
    if (contradictionScore > 0.5) {
      issues.push('contradictions detected');
    }
    if (redundancyScore > 0.5) {
      issues.push('high redundancy');
    }
    if (informationGain < 0.3) {
      issues.push('low information gain');
    }
    if (goalAlignment < 0.5) {
      issues.push('poor goal alignment');
    }
    
    return issues;
  }

  private interpretEvaluation(result: any): string {
    const { overallScore } = result;
    let interpretation = `Overall Score: ${overallScore.toFixed(2)} - `;
    interpretation += this.getScoreInterpretation(overallScore);
    
    const issues = this.collectIssues(result);
    if (issues.length > 0) {
      interpretation += ` (Issues: ${issues.join(', ')})`;
    }
    
    return interpretation;
  }

  private createThoughtInput(inputData: any): BranchingThoughtInput {
    return {
      content: inputData.content,
      type: inputData.type || 'analysis',
      branchId: inputData.branchId,
      parentBranchId: inputData.parentBranchId,
      confidence: inputData.confidence,
      keyPoints: inputData.keyPoints || [],
      crossRefs: inputData.crossRefs || []
    };
  }

  private createResponse(result: any, branch: any): any {
    const response: any = {
      thoughtId: result.thought.id,
      branchId: result.thought.branchId,
      branchState: branch.state,
      branchPriority: branch.priority,
      numThoughts: branch.thoughts.length,
      activeBranch: this.branchManager.getActiveBranch()?.id
    };

    if (result.feedback) {
      response.evaluation = {
        score: result.feedback.score,
        quality: result.feedback.quality,
        issues: result.feedback.issues,
        suggestions: result.feedback.suggestions,
        shouldPivot: result.feedback.shouldPivot
      };
    }

    return response;
  }

  async processThought(input: unknown): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    try {
      const inputData = input as any;
      
      if (inputData.command) {
        return this.handleCommand(inputData.command);
      }

      const thoughtInput = this.createThoughtInput(inputData);
      const result = await this.branchManager.addThought(thoughtInput);
      const branch = this.branchManager.getBranch(result.thought.branchId);
      if (!branch) {
        throw new Error(`Branch ${result.thought.branchId} not found`);
      }
      const response = this.createResponse(result, branch);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            status: 'failed'
          }, null, 2)
        }],
        isError: true
      };
    }
  }

  private async handleCommand(command: { type: string; branchId?: string; data?: any; goal?: string; query?: string }): Promise<{ content: Array<{ type: string; text: string }> }> {
    const result = await this.commandHandler.handleCommand(command.type, command);
    
    if (command.type === 'evaluate' && result.content[0]) {
      try {
        const parsed = JSON.parse(result.content[0].text);
        if (parsed.evaluation) {
          parsed.interpretation = this.interpretEvaluation(parsed.evaluation);
          result.content[0].text = JSON.stringify(parsed, null, 2);
        }
      } catch {
        // If parsing fails, just return as-is
      }
    }
    
    return result;
  }
}

const BRANCHING_THOUGHT_TOOL: Tool = createToolDefinition();

const server = new Server(
  {
    name: 'branch-thinking-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const thinkingServer = new BranchingThoughtServer();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [BRANCHING_THOUGHT_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'branch-thinking') {
    return await thinkingServer.processThought(request.params.arguments);
  }

  return {
    content: [{
      type: 'text',
      text: `Unknown tool: ${request.params.name}`
    }],
    isError: true
  };
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch((error) => {
  process.exit(1);
});
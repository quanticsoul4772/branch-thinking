import { BranchManagerAdapter } from '../branchManagerAdapter.js';

export interface CommandResult {
  content: Array<{ type: string; text: string }>;
}

export interface CommandData {
  branchId?: string;
  data?: any;
  goal?: string;
  query?: string;
  // Additional properties used by specific commands
  limit?: number;
  thoughtId?: string;
  fromThoughtId?: string;
  toThoughtId?: string;
  branch1Id?: string;
  branch2Id?: string;
}

export abstract class Command {
  constructor(protected branchManager: BranchManagerAdapter) {}
  
  abstract execute(data: CommandData): Promise<CommandResult>;
  
  protected createSuccessResponse(data: any): CommandResult {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(data, null, 2)
      }]
    };
  }
  
  protected createErrorResponse(error: unknown): CommandResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: errorMessage,
          status: 'failed'
        }, null, 2)
      }]
    };
  }
}

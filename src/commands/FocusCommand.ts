import { Command, CommandData, CommandResult } from './Command.js';

export class FocusCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    if (!data.branchId) {
      return this.createErrorResponse('branchId required for focus command');
    }
    
    try {
      this.branchManager.setActiveBranch(data.branchId);
      const branch = this.branchManager.getBranch(data.branchId);
      
      if (!branch) {
        return this.createErrorResponse(`Branch not found: ${data.branchId}`);
      }
      
      return this.createSuccessResponse({
        status: 'success',
        message: `Now focused on branch: ${data.branchId}`,
        activeBranch: data.branchId
      });
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

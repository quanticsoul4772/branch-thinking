import { Command, CommandData, CommandResult } from './Command.js';

export class HistoryCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    const branchId = data.branchId || this.branchManager.getActiveBranch()?.id;
    if (!branchId) {
      return this.createErrorResponse('No active branch and no branchId provided');
    }
    
    try {
      const history = this.branchManager.getBranchHistory(branchId);
      return this.createSuccessResponse(history);
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

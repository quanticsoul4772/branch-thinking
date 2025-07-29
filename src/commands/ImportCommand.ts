import { Command, CommandData, CommandResult } from './Command.js';

export class ImportCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    if (!data.data) {
      return this.createErrorResponse('Import data required');
    }
    
    try {
      await this.branchManager.importFromMemory(data.data);
      return this.createSuccessResponse({
        status: 'success',
        message: 'Branches imported successfully',
        branchCount: this.branchManager.getAllBranches().length,
        activeBranch: this.branchManager.getActiveBranch()?.id
      });
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

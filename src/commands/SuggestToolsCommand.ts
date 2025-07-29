import { Command, CommandData, CommandResult } from './Command.js';

export class SuggestToolsCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    const branchId = data.branchId || this.branchManager.getActiveBranch()?.id;
    if (!branchId) {
      return this.createErrorResponse('No branch specified or active');
    }
    
    try {
      const result = this.branchManager.suggestTools(branchId);
      if (!result) {
        return this.createErrorResponse('Branch not found');
      }

      return this.createSuccessResponse({
        branchId,
        suggestions: result,
        message: result.length > 0 
          ? `Found ${result.length} relevant tools for this branch`
          : 'No specific tool suggestions for current branch content'
      });
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

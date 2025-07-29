import { Command, CommandData, CommandResult } from './Command.js';

export class DetectKnowledgeGapsCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    const branchId = data.branchId || this.branchManager.getActiveBranch()?.id;
    if (!branchId) {
      return this.createErrorResponse('No branch specified or active');
    }
    
    try {
      const result = await this.branchManager.detectKnowledgeGaps(branchId);
      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

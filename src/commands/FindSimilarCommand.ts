import { Command, CommandData, CommandResult } from './Command.js';


export class FindSimilarCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    if (!data.query) {
      return this.createErrorResponse('query required for findSimilar command');
    }
    
    try {
      const result = await this.branchManager.findSimilar(data.query, data?.limit || 10);
      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

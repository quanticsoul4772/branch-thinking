import { Command, CommandData, CommandResult } from './Command.js';


export class FindStrongestPathsCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    if (!data.query) {
      return this.createErrorResponse('Target conclusion required');
    }
    
    try {
      const result = this.branchManager.findStrongestPaths(data.query);
      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

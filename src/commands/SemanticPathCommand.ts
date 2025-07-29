import { Command, CommandData, CommandResult } from './Command.js';

export class SemanticPathCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    if (!data.data?.fromThoughtId) {
      return this.createErrorResponse('fromThoughtId required in data for semanticPath command');
    }
    if (!data.data?.toThoughtId) {
      return this.createErrorResponse('toThoughtId required in data for semanticPath command');
    }
    
    try {
      const result = await this.branchManager.semanticPath(
        data.data.fromThoughtId,
        data.data.toThoughtId
      );
      
      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

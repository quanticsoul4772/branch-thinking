import { Command, CommandData, CommandResult } from './Command.js';

export class JumpToRelatedCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    if (!data.data?.thoughtId) {
      return this.createErrorResponse('thoughtId required in data for jumpToRelated command');
    }
    
    try {
      const result = await this.branchManager.jumpToRelated(
        data.data.thoughtId,
        data.data.limit || 5
      );
      
      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

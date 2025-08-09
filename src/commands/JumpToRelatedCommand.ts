import { Command, CommandData, CommandResult } from './Command.js';

export class JumpToRelatedCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    const params = data.data as { thoughtId?: string; limit?: number } | undefined;
    if (!params?.thoughtId) {
      return this.createErrorResponse('thoughtId required in data for jumpToRelated command');
    }
    
    try {
      const result = await this.branchManager.jumpToRelated(
        params.thoughtId,
        params.limit || 5
      );
      
      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

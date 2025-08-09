import { Command, CommandData, CommandResult } from './Command.js';

export class SemanticPathCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    const params = data.data as { fromThoughtId?: string; toThoughtId?: string } | undefined;
    if (!params?.fromThoughtId) {
      return this.createErrorResponse('fromThoughtId required in data for semanticPath command');
    }
    if (!params?.toThoughtId) {
      return this.createErrorResponse('toThoughtId required in data for semanticPath command');
    }
    
    try {
      const result = await this.branchManager.semanticPath(
        params.fromThoughtId,
        params.toThoughtId
      );
      
      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

import { Command, CommandData, CommandResult } from './Command.js';

export class FindContradictionsCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    try {
      const result = await this.branchManager.findContradictions();
      
      return this.createSuccessResponse({
        contradictions: result,
        count: result.length
      });
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

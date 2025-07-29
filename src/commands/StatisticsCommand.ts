import { Command, CommandData, CommandResult } from './Command.js';

export class StatisticsCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    try {
      const result = this.branchManager.getReasoningStatistics();
      
      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

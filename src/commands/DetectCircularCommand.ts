import { Command, CommandData, CommandResult } from './Command.js';

export class DetectCircularCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    try {
      const result = this.branchManager.detectCircularReasoning();
      
      return this.createSuccessResponse({
        circularPaths: result,
        hasCircularReasoning: result
      });
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

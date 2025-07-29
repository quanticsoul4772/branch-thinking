import { Command, CommandData, CommandResult } from './Command.js';

export class DetectDriftCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    try {
      const result = await this.branchManager.detectDrift();
      
      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

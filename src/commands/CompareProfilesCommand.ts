import { Command, CommandData, CommandResult } from './Command.js';

export class CompareProfilesCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    try {
      const result = await this.branchManager.compareProfiles();
      
      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

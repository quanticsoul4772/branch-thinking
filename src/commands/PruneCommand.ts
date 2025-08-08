import { Command, CommandData, CommandResult } from './Command.js';
import { getConfig } from '../config.js';

export class PruneCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    const threshold = data.data?.threshold ?? getConfig().branch.pruneThreshold;
    
    try {
      const result = await this.branchManager.pruneLowScoringBranches(threshold);
      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

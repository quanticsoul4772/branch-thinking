import { Command, CommandData, CommandResult } from './Command.js';
import { getConfig } from '../config.js';

export class PruneCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    const params = data.data as { threshold?: number } | undefined;
    const threshold = params?.threshold ?? getConfig().branch.pruneThreshold;
    
    try {
      const result = await this.branchManager.pruneLowScoringBranches(threshold);
      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

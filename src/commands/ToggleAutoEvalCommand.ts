import { Command, CommandData, CommandResult } from './Command.js';

export class ToggleAutoEvalCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    try {
      const config = this.branchManager.getAutoEvaluationConfig();
      config.enabled = !config.enabled;
      this.branchManager.setAutoEvaluationConfig(config);
      
      return this.createSuccessResponse({
        status: 'success',
        message: `Auto-evaluation ${config.enabled ? 'enabled' : 'disabled'}`,
        config
      });
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

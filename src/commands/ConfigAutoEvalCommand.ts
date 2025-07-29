import { Command, CommandData, CommandResult } from './Command.js';


export class ConfigAutoEvalCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    if (!data.data) {
      // Return current config
      const config = this.branchManager.getAutoEvaluationConfig();
      return this.createSuccessResponse({
        status: 'success',
        currentConfig: config
      });
    }
    
    try {
      // Update config
      this.branchManager.setAutoEvaluationConfig(data.data);
      const newConfig = this.branchManager.getAutoEvaluationConfig();
      
      return this.createSuccessResponse({
        status: 'success',
        message: 'Auto-evaluation configuration updated',
        config: newConfig
      });
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

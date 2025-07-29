import { Command, CommandData, CommandResult } from './Command.js';

export class SetGoalCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    if (!data.goal) {
      return this.createErrorResponse('Goal required');
    }
    
    try {
      this.branchManager.setGoal(data.goal);
      return this.createSuccessResponse({
        status: 'success',
        message: 'Goal set successfully',
        goal: data.goal
      });
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

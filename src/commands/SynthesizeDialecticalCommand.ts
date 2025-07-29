import { Command, CommandData, CommandResult } from './Command.js';

export class SynthesizeDialecticalCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    if (!data.data?.branch1Id) {
      return this.createErrorResponse('branch1Id required in data for synthesizeDialectical command');
    }
    
    try {
      const result = await this.branchManager.synthesizeDialectical(
        data.data.branch1Id,
        data.data.branch2Id
      );
      
      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

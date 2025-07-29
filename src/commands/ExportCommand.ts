import { Command, CommandData, CommandResult } from './Command.js';

export class ExportCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    try {
      const exportData = this.branchManager.exportForMemory();
      return this.createSuccessResponse(exportData);
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

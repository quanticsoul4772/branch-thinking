import { Command, CommandData, CommandResult } from './Command.js';

// Type for import data structure
interface ImportData {
  entities: any[];
  relations: any[];
  [key: string]: unknown;
}

export class ImportCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    if (!data.data) {
      return this.createErrorResponse('Import data required');
    }
    
    // Type assertion for import data
    const importData = data.data as ImportData;
    if (!importData.entities || !Array.isArray(importData.entities) ||
        !importData.relations || !Array.isArray(importData.relations)) {
      return this.createErrorResponse('Import data must contain entities and relations arrays');
    }
    
    try {
      await this.branchManager.importFromMemory(importData);
      return this.createSuccessResponse({
        status: 'success',
        message: 'Branches imported successfully',
        branchCount: this.branchManager.getAllBranches().length,
        activeBranch: this.branchManager.getActiveBranch()?.id
      });
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}

import { Command, CommandData, CommandResult } from './Command.js';

export class ListCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    const branches = this.branchManager.getAllBranches();
    const activeBranchId = this.branchManager.getActiveBranch()?.id;
    const branchList = branches.map(b => ({
      id: b.id,
      state: b.state,
      isActive: b.id === activeBranchId,
      thoughtCount: b.thoughts.length,
      lastThought: b.thoughts[b.thoughts.length - 1]?.content || null,
      priority: b.priority
    }));
    
    return this.createSuccessResponse({
      branches: branchList,
      activeBranchId,
      totalBranches: branches.length
    });
  }
}

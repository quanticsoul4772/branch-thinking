import { BranchManagerAdapter } from '../branchManagerAdapter.js';
import { Command, CommandData, CommandResult } from './Command.js';
import { logger } from '../utils/logger.js';

// Import all command implementations
import { ListCommand } from './ListCommand.js';
import { FocusCommand } from './FocusCommand.js';
import { HistoryCommand } from './HistoryCommand.js';
import { ExportCommand } from './ExportCommand.js';
import { ImportCommand } from './ImportCommand.js';
import { SetGoalCommand } from './SetGoalCommand.js';
import { EvaluateCommand } from './EvaluateCommand.js';
import { StatisticsCommand } from './StatisticsCommand.js';
import { FindContradictionsCommand } from './FindContradictionsCommand.js';
import { FindStrongestPathsCommand } from './FindStrongestPathsCommand.js';
import { DetectCircularCommand } from './DetectCircularCommand.js';
import { PruneCommand } from './PruneCommand.js';
import { ToggleAutoEvalCommand } from './ToggleAutoEvalCommand.js';
import { ConfigAutoEvalCommand } from './ConfigAutoEvalCommand.js';
import { SuggestToolsCommand } from './SuggestToolsCommand.js';
import { CompareProfilesCommand } from './CompareProfilesCommand.js';
import { SuggestMergesCommand } from './SuggestMergesCommand.js';
import { DetectDriftCommand } from './DetectDriftCommand.js';
import { GenerateCounterfactualsCommand } from './GenerateCounterfactualsCommand.js';
import { DetectKnowledgeGapsCommand } from './DetectKnowledgeGapsCommand.js';
import { SynthesizeDialecticalCommand } from './SynthesizeDialecticalCommand.js';
import { FindSimilarCommand } from './FindSimilarCommand.js';
import { JumpToRelatedCommand } from './JumpToRelatedCommand.js';
import { SemanticPathCommand } from './SemanticPathCommand.js';

export class CommandHandler {
  private commands: Map<string, Command> = new Map();
  
  constructor(private branchManager: BranchManagerAdapter) {
    this.registerCommands();
  }
  
  private registerCommands(): void {
    // Register all command implementations
    this.commands.set('list', new ListCommand(this.branchManager));
    this.commands.set('focus', new FocusCommand(this.branchManager));
    this.commands.set('history', new HistoryCommand(this.branchManager));
    this.commands.set('export', new ExportCommand(this.branchManager));
    this.commands.set('import', new ImportCommand(this.branchManager));
    this.commands.set('setGoal', new SetGoalCommand(this.branchManager));
    this.commands.set('evaluate', new EvaluateCommand(this.branchManager));
    this.commands.set('statistics', new StatisticsCommand(this.branchManager));
    this.commands.set('findContradictions', new FindContradictionsCommand(this.branchManager));
    this.commands.set('findStrongestPaths', new FindStrongestPathsCommand(this.branchManager));
    this.commands.set('detectCircular', new DetectCircularCommand(this.branchManager));
    this.commands.set('prune', new PruneCommand(this.branchManager));
    this.commands.set('toggleAutoEval', new ToggleAutoEvalCommand(this.branchManager));
    this.commands.set('configAutoEval', new ConfigAutoEvalCommand(this.branchManager));
    this.commands.set('suggestTools', new SuggestToolsCommand(this.branchManager));
    this.commands.set('compareProfiles', new CompareProfilesCommand(this.branchManager));
    this.commands.set('suggestMerges', new SuggestMergesCommand(this.branchManager));
    this.commands.set('detectDrift', new DetectDriftCommand(this.branchManager));
    this.commands.set('generateCounterfactuals', new GenerateCounterfactualsCommand(this.branchManager));
    this.commands.set('detectKnowledgeGaps', new DetectKnowledgeGapsCommand(this.branchManager));
    this.commands.set('synthesizeDialectical', new SynthesizeDialecticalCommand(this.branchManager));
    this.commands.set('findSimilar', new FindSimilarCommand(this.branchManager));
    this.commands.set('jumpToRelated', new JumpToRelatedCommand(this.branchManager));
    this.commands.set('semanticPath', new SemanticPathCommand(this.branchManager));
    
    logger.info(`Registered ${this.commands.size} commands`);
  }
  
  async handleCommand(type: string, data: CommandData): Promise<CommandResult> {
    logger.debug(`Handling command: ${type}`, data as Record<string, unknown>);
    
    const command = this.commands.get(type);
    if (!command) {
      logger.error(`Unknown command: ${type}`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Unknown command: ${type}`,
            status: 'failed',
            availableCommands: Array.from(this.commands.keys())
          }, null, 2)
        }]
      };
    }
    
    try {
      return await command.execute(data);
    } catch (error) {
      logger.error(`Command execution failed: ${type}`, error instanceof Error ? error : { error: String(error) });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            status: 'failed'
          }, null, 2)
        }]
      };
    }
  }
  
  getAvailableCommands(): string[] {
    return Array.from(this.commands.keys());
  }
}

import { Command, CommandData, CommandResult } from './Command.js';
import { EvaluationInput } from '../types/interfaces.js';

export class EvaluateCommand extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    const branchId = data.branchId || this.branchManager.getActiveBranch()?.id;
    if (!branchId) {
      return this.createErrorResponse('No branch specified or active');
    }
    
    try {
      const result = await this.branchManager.evaluateBranch(branchId);
      if (!result) {
        return this.createErrorResponse('Branch not found');
      }
      
      return this.createSuccessResponse({
        branchId,
        evaluation: result,
        interpretation: this.interpretEvaluation(result)
      });
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
  
  private interpretEvaluation(result: EvaluationInput): string {
    const { overallScore, coherenceScore, contradictionScore, redundancyScore, 
      informationGain, goalAlignment } = result;
    
    let interpretation = `Overall Score: ${overallScore.toFixed(2)} - `;
    
    if (overallScore > 0.8) {
      interpretation += 'Excellent reasoning path';
    } else if (overallScore > 0.6) {
      interpretation += 'Good reasoning, some improvements possible';
    } else if (overallScore > 0.4) {
      interpretation += 'Moderate quality, significant issues';
    } else {
      interpretation += 'Poor reasoning, consider abandoning';
    }
    
    const issues = [];
    if (coherenceScore < 0.5) {
      issues.push('low coherence');
    }
    if (contradictionScore > 0.5) {
      issues.push('contradictions detected');
    }
    if (redundancyScore > 0.5) {
      issues.push('high redundancy');
    }
    if (informationGain < 0.3) {
      issues.push('low information gain');
    }
    if (goalAlignment < 0.5) {
      issues.push('poor goal alignment');
    }
    
    if (issues.length > 0) {
      interpretation += ` (Issues: ${issues.join(', ')})`;
    }
    
    return interpretation;
  }
}

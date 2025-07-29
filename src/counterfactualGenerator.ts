/**
 * Counterfactual Reasoning Engine
 * Generates "what-if" scenario branches from existing branches
 */

import { BranchGraph } from './branchGraph.js';
import { BranchNode, ThoughtData } from './types.js';

export interface CounterfactualScenario {
  originalBranchId: string;
  assumption: string;
  variationType: 'opposite' | 'extreme' | 'moderate' | 'alternative';
  confidence: number;
}

export class CounterfactualGenerator {
  /**
   * Generate counterfactual branches from an existing branch
   */
  async generateCounterfactuals(
    graph: BranchGraph,
    branchId: string
  ): Promise<string[]> {
    const branch = graph.getBranch(branchId);
    if (!branch) {
      throw new Error(`Branch ${branchId} not found`);
    }

    const scenarios = this.identifyCounterfactualOpportunities(graph, branch);
    const newBranchIds: string[] = [];

    for (const scenario of scenarios) {
      const cfBranchId = await this.createCounterfactualBranch(
        graph,
        branch,
        scenario
      );
      newBranchIds.push(cfBranchId);
    }

    return newBranchIds;
  }

  /**
   * Identify opportunities for counterfactual scenarios
   */
  private identifyCounterfactualOpportunities(
    graph: BranchGraph,
    branch: BranchNode
  ): CounterfactualScenario[] {
    const scenarios: CounterfactualScenario[] = [];
    const thoughts = this.getBranchThoughts(graph, branch);

    // Analyze thoughts for assumptions and claims
    for (const thought of thoughts) {
      const assumptions = this.extractAssumptions(thought.content);
      
      for (const assumption of assumptions) {
        // Generate opposite scenario
        scenarios.push({
          originalBranchId: branch.id,
          assumption: `What if the opposite were true: NOT(${assumption})`,
          variationType: 'opposite',
          confidence: 0.8
        });

        // Generate extreme scenario
        scenarios.push({
          originalBranchId: branch.id,
          assumption: `What if taken to extreme: MAXIMIZE(${assumption})`,
          variationType: 'extreme',
          confidence: 0.7
        });
      }
    }

    // Limit to top scenarios
    return scenarios.slice(0, 3);
  }

  /**
   * Extract assumptions from thought content
   */
  private extractAssumptions(content: string): string[] {
    const assumptions: string[] = [];
    const lower = content.toLowerCase();

    // Pattern matching for assumptions
    const assumptionPatterns = [
      /assuming (?:that )?(.+?)(?:\.|,|;|$)/gi,
      /if (.+?) then/gi,
      /given (?:that )?(.+?)(?:\.|,|;|$)/gi,
      /suppose (?:that )?(.+?)(?:\.|,|;|$)/gi,
      /(?:we |I )(?:can |could |should |must )(.+?)(?:\.|,|;|$)/gi
    ];

    for (const pattern of assumptionPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const assumption = match[1].trim();
        if (assumption.length > 10 && assumption.length < 100) {
          assumptions.push(assumption);
        }
      }
    }

    // Also look for implicit assumptions in claims
    if (content.includes('will') || content.includes('would')) {
      const futurePattern = /(?:will|would) (.+?)(?:\.|,|;|$)/gi;
      let match;
      while ((match = futurePattern.exec(content)) !== null) {
        assumptions.push(`future state: ${match[1].trim()}`);
      }
    }

    return [...new Set(assumptions)]; // Remove duplicates
  }

  /**
   * Create a new counterfactual branch
   */
  private async createCounterfactualBranch(
    graph: BranchGraph,
    originalBranch: BranchNode,
    scenario: CounterfactualScenario
  ): Promise<string> {
    // Create new branch
    const cfBranchId = `${originalBranch.id}-cf-${Date.now()}`;
    
    // Add initial counterfactual thought
    await graph.addThought({
      content: `COUNTERFACTUAL SCENARIO: ${scenario.assumption}. This branch explores an alternative reality where this assumption holds true.`,
      branchId: cfBranchId,
      type: 'counterfactual',
      confidence: scenario.confidence,
      keyPoints: ['counterfactual', scenario.variationType, 'what-if scenario']
    });

    // Copy and modify key thoughts from original branch
    const thoughts = this.getBranchThoughts(graph, originalBranch).slice(0, 3);
    
    for (const thought of thoughts) {
      const modifiedContent = this.applyCounterfactualLens(
        thought.content,
        scenario
      );
      
      await graph.addThought({
        content: modifiedContent,
        branchId: cfBranchId,
        type: thought.metadata.type,
        confidence: thought.metadata.confidence * scenario.confidence,
        keyPoints: [...thought.metadata.keyPoints, 'counterfactual-modified']
      });
    }

    return cfBranchId;
  }

  /**
   * Modify content based on counterfactual assumption
   */
  private applyCounterfactualLens(
    content: string,
    scenario: CounterfactualScenario
  ): string {
    let modified = content;

    switch (scenario.variationType) {
      case 'opposite':
        // Negate key claims
        modified = modified
          .replace(/will /g, 'will not ')
          .replace(/can /g, 'cannot ')
          .replace(/should /g, 'should not ')
          .replace(/is /g, 'is not ')
          .replace(/increase/g, 'decrease')
          .replace(/improve/g, 'worsen')
          .replace(/benefit/g, 'harm');
        break;

      case 'extreme':
        // Amplify claims
        modified = modified
          .replace(/some /g, 'all ')
          .replace(/might /g, 'definitely will ')
          .replace(/could /g, 'must ')
          .replace(/partially /g, 'completely ')
          .replace(/gradually /g, 'immediately ');
        break;

      case 'moderate':
        // Soften claims
        modified = modified
          .replace(/will /g, 'might ')
          .replace(/all /g, 'some ')
          .replace(/definitely /g, 'possibly ')
          .replace(/must /g, 'could ');
        break;
    }

    return `[COUNTERFACTUAL] ${modified}`;
  }

  /**
   * Get thoughts for a branch
   */
  private getBranchThoughts(graph: BranchGraph, branch: BranchNode): ThoughtData[] {
    return branch.thoughtIds
      .map(id => graph.getThought(id))
      .filter((t): t is ThoughtData => t !== undefined);
  }
}

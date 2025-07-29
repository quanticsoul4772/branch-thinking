import { ThoughtData, ThoughtBranch } from '../types.js';
import { getConfig } from '../config.js';

/**
 * Helper class for formatting operations
 * Extracted from BranchManagerAdapter to reduce complexity
 */
export class FormattingHelper {
  /**
   * Format branch status for JSON output
   */
  formatBranchStatus(branch: ThoughtBranch | null | undefined, activeBranchId: string | null): any {
    if (!branch) return { error: 'Branch not found' };
    
    const isActive = branch.id === activeBranchId;
    const config = getConfig();
    const recentThoughts = branch.thoughts.slice(-config.display.recentThoughtsCount);
    
    return {
      id: branch.id,
      state: branch.state,
      isActive,
      priority: branch.priority,
      confidence: branch.confidence,
      totalThoughts: branch.thoughts.length,
      recentThoughts: recentThoughts.map(t => ({
        content: t.content.slice(0, config.display.thoughtCharLimit),
        type: t.metadata.type,
        timestamp: t.timestamp.toISOString()
      }))
    };
  }
  
  /**
   * Format branch history for JSON output
   */
  formatBranchHistory(
    branchId: string, 
    branch: any, 
    thoughts: ThoughtData[]
  ): any {
    return {
      branchId,
      state: branch.state,
      thoughtCount: thoughts.length,
      thoughts: thoughts.map((t, i) => this.formatThoughtForHistory(t, i))
    };
  }
  
  /**
   * Format thought for history
   */
  private formatThoughtForHistory(thought: ThoughtData, index: number): any {
    return {
      index: index + 1,
      id: thought.id,
      timestamp: new Date(thought.timestamp).toISOString(),
      type: thought.metadata.type,
      content: thought.content,
      keyPoints: thought.metadata.keyPoints,
      confidence: thought.metadata.confidence
    };
  }
  
  /**
   * Format similar thought result
   */
  formatSimilarThought(result: any): {
    thoughtId: string;
    content: string;
    branchId: string;
    similarity: number;
    type: string;
  } {
    return {
      thoughtId: result.thoughtId,
      content: this.truncateContent(result.content, 200),
      branchId: result.branchId,
      similarity: result.similarity,
      type: result.type
    };
  }
  
  /**
   * Format related thought result
   */
  formatRelatedThought(result: any): {
    thoughtId: string;
    content: string;
    branchId: string;
    similarity: number;
    relationship: string;
  } {
    return {
      thoughtId: result.thoughtId,
      content: this.truncateContent(result.content, 200),
      branchId: result.branchId,
      similarity: result.similarity,
      relationship: result.relationship
    };
  }
  
  /**
   * Format semantic path result
   */
  formatSemanticPath(path: any[], toThoughtId: string): {
    path: Array<{
      thoughtId: string;
      content: string;
      branchId: string;
      similarity: number;
    }>;
    totalDistance: number;
    message: string;
  } {
    const totalDistance = path[path.length - 1].cumulativeDistance;
    
    return {
      path: path.map(node => ({
        thoughtId: node.thoughtId,
        content: this.truncateContent(node.content, 100),
        branchId: node.branchId,
        similarity: node.similarity
      })),
      totalDistance,
      message: path[path.length - 1].thoughtId === toThoughtId 
        ? `Found path with ${path.length} steps`
        : `Partial path found with ${path.length} steps (did not reach target)`
    };
  }
  
  /**
   * Format knowledge gap
   */
  formatKnowledgeGap(gap: any): {
    type: 'missing_data' | 'uncertain_claim' | 'vague_reference' | 'assumed_knowledge';
    description: string;
    suggestedAction: string;
    confidence: number;
  } {
    const typeMap: Record<string, 'missing_data' | 'uncertain_claim' | 'vague_reference' | 'assumed_knowledge'> = {
      'factual': 'missing_data',
      'technical': 'missing_data',
      'temporal': 'uncertain_claim',
      'causal': 'vague_reference'
    };
    
    return {
      type: typeMap[gap.gapType] || 'assumed_knowledge',
      description: gap.description,
      suggestedAction: gap.suggestedQuery,
      confidence: gap.confidence
    };
  }
  
  /**
   * Truncate content to specified length
   */
  truncateContent(content: string, maxLength: number): string {
    return content.length > maxLength 
      ? content.substring(0, maxLength) + '...' 
      : content;
  }
}

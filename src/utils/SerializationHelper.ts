import { BranchGraph } from '../branchGraph.js';
import { ThoughtData } from '../types.js';

/**
 * Helper class for serialization operations (export/import)
 * Extracted from BranchManagerAdapter to reduce complexity
 */
export class SerializationHelper {
  /**
   * Export branches and session state for memory storage
   */
  exportForMemory(
    graph: BranchGraph, 
    activeBranchId: string | null
  ): { entities: any[], relations: any[] } {
    const entities: any[] = [];
    const relations: any[] = [];
    
    // Export branches
    this.exportBranches(graph, entities);
    
    // Add session state
    this.exportSessionState(graph, activeBranchId, entities);
    
    return { entities, relations };
  }
  
  /**
   * Export branches
   */
  private exportBranches(graph: BranchGraph, entities: any[]): void {
    for (const branch of graph.getAllBranches()) {
      const observations = this.createBranchObservations(graph, branch);
      
      entities.push({
        name: `BRN_${branch.id}`,
        entityType: 'BRANCH',
        observations
      });
    }
  }
  
  /**
   * Create branch observations
   */
  private createBranchObservations(graph: BranchGraph, branch: any): string[] {
    const thoughts = this.getBranchThoughts(graph, branch);
    
    const observations: string[] = [
      `Branch state: ${branch.state}`,
      `Priority: ${branch.priority}`,
      `Confidence: ${branch.confidence}`,
      `Parent branch: ${branch.parentId || 'none'}`
    ];
    
    // Add thought observations
    thoughts.forEach(thought => {
      observations.push(this.formatThoughtObservation(thought));
      
      if (thought.metadata.keyPoints && thought.metadata.keyPoints.length > 0) {
        observations.push(this.formatKeyPointsObservation(thought));
      }
    });
    
    return observations;
  }
  
  /**
   * Get thoughts for a branch
   */
  private getBranchThoughts(graph: BranchGraph, branch: any): ThoughtData[] {
    return branch.thoughts
      .map((id: string) => graph.getThought(id))
      .filter((t: ThoughtData | undefined): t is ThoughtData => t !== undefined);
  }
  
  /**
   * Format thought observation
   */
  private formatThoughtObservation(thought: ThoughtData): string {
    const timestamp = new Date(thought.timestamp).toISOString();
    return `THOUGHT[${thought.id}|${timestamp}|${thought.metadata.type}|conf:${thought.metadata.confidence}]: ${thought.content}`;
  }
  
  /**
   * Format key points observation
   */
  private formatKeyPointsObservation(thought: ThoughtData): string {
    return `KEYPOINTS[${thought.id}]: ${thought.metadata.keyPoints.join('; ')}`;
  }
  
  /**
   * Export session state
   */
  private exportSessionState(
    graph: BranchGraph, 
    activeBranchId: string | null, 
    entities: any[]
  ): void {
    entities.push({
      name: 'BRN_SESSION_STATE',
      entityType: 'SESSION',
      observations: [
        `Active branch: ${activeBranchId || 'none'}`,
        `Total branches: ${graph.getAllBranches().length}`,
        `Export timestamp: ${new Date().toISOString()}`
      ]
    });
  }
  
  /**
   * Import from memory storage
   */
  async importFromMemory(
    graph: BranchGraph,
    data: { entities: any[], relations: any[] }
  ): Promise<{ activeBranchId: string | null }> {
    let activeBranchId: string | null = null;
    
    for (const entity of data.entities) {
      if (!this.isBranchEntity(entity)) {
        continue;
      }
      
      const branchId = entity.name.substring(4);
      const result = await this.importBranchThoughts(graph, entity.observations, branchId);
      
      if (result.isActive) {
        activeBranchId = branchId;
      }
    }
    
    return { activeBranchId };
  }
  
  /**
   * Check if entity is a branch
   */
  private isBranchEntity(entity: any): boolean {
    return entity.entityType === 'BRANCH' && entity.name.startsWith('BRN_');
  }
  
  /**
   * Import branch thoughts
   */
  private async importBranchThoughts(
    graph: BranchGraph,
    observations: string[],
    branchId: string
  ): Promise<{ isActive: boolean }> {
    let isActive = false;
    
    for (const obs of observations) {
      if (obs.startsWith('THOUGHT[')) {
        await this.importThought(graph, obs, branchId);
      } else if (obs === 'Active branch: yes') {
        isActive = true;
      }
    }
    
    return { isActive };
  }
  
  /**
   * Import single thought
   */
  private async importThought(
    graph: BranchGraph, 
    observation: string, 
    branchId: string
  ): Promise<void> {
    const match = observation.match(/^THOUGHT\[([^|]+)\|([^|]+)\|([^|]+)\|conf:([\d.]+)\]: (.+)$/);
    if (!match) {
      return;
    }
    
    const [, id, timestamp, type, confidence, content] = match;
    
    if (!content || !type || !confidence) {
      throw new Error('Invalid thought data extracted from match');
    }
    
    await graph.addThought({
      content,
      branchId,
      type,
      confidence: parseFloat(confidence)
    });
  }
}

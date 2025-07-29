/**
 * Dialectical Synthesis Engine
 * Merges contradictory branches to create higher-level understanding
 */

import { BranchGraph } from './branchGraph.js';
import { BranchNode, ThoughtData } from './types.js';
import { SemanticSimilarityService } from './semanticSimilarity.js';
import { ContradictionDetector } from './analyzers/ContradictionDetector.js';
import { ResolutionGenerator, ResolutionType } from './analyzers/ResolutionGenerator.js';
import { SynthesisBuilder } from './analyzers/SynthesisBuilder.js';

export interface Contradiction {
  branch1Id: string;
  branch2Id: string;
  contradictionPoints: Array<{
    thought1: string;
    thought2: string;
    type: 'direct' | 'implicit' | 'assumption';
  }>;
  confidence: number;
}

export interface SynthesisResult {
  synthesisBranchId: string;
  originalBranches: [string, string];
  resolutionType: ResolutionType;
  confidence: number;
}

export class DialecticalSynthesizer {
  private semanticSimilarity: SemanticSimilarityService;
  private contradictionDetector = new ContradictionDetector();
  private resolutionGenerator = new ResolutionGenerator();
  private synthesisBuilder = new SynthesisBuilder();

  constructor() {
    this.semanticSimilarity = SemanticSimilarityService.getInstance();
  }

  /**
   * Find contradictions between branches
   */
  async findContradictions(graph: BranchGraph): Promise<Contradiction[]> {
    const branches = graph.getAllBranches();
    const contradictions = await this.findAllContradictions(graph, branches);
    return contradictions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Find all contradictions between branch pairs
   */
  private async findAllContradictions(
    graph: BranchGraph,
    branches: BranchNode[]
  ): Promise<Contradiction[]> {
    const contradictions: Contradiction[] = [];
    const pairs = this.generateBranchPairs(branches);

    for (const [branch1, branch2] of pairs) {
      const contradiction = await this.analyzeBranchPair(graph, branch1, branch2);
      if (contradiction && contradiction.contradictionPoints.length > 0) {
        contradictions.push(contradiction);
      }
    }

    return contradictions;
  }

  /**
   * Generate all unique branch pairs
   */
  private generateBranchPairs(branches: BranchNode[]): Array<[BranchNode, BranchNode]> {
    const pairs: Array<[BranchNode, BranchNode]> = [];
    
    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        pairs.push([branches[i], branches[j]]);
      }
    }
    
    return pairs;
  }

  /**
   * Synthesize contradictory branches
   */
  async synthesizeBranches(
    graph: BranchGraph,
    branch1Id: string,
    branch2Id: string
  ): Promise<SynthesisResult> {
    const branch1 = graph.getBranch(branch1Id);
    const branch2 = graph.getBranch(branch2Id);

    if (!branch1 || !branch2) {
      throw new Error('One or both branches not found');
    }

    // Analyze contradiction
    const contradiction = await this.analyzeBranchPair(graph, branch1, branch2);
    if (!contradiction) {
      throw new Error('No contradiction found between branches');
    }

    // Create synthesis
    const synthesisBranchId = await this.createSynthesis(
      graph,
      branch1,
      branch2,
      contradiction
    );

    const resolutionType = this.resolutionGenerator.determineResolutionType(
      contradiction.contradictionPoints
    );

    return {
      synthesisBranchId,
      originalBranches: [branch1Id, branch2Id],
      resolutionType,
      confidence: this.synthesisBuilder.calculateSynthesisConfidence(
        branch1,
        branch2,
        resolutionType
      )
    };
  }

  /**
   * Analyze a pair of branches for contradictions
   */
  private async analyzeBranchPair(
    graph: BranchGraph,
    branch1: BranchNode,
    branch2: BranchNode
  ): Promise<Contradiction | null> {
    const thoughts1 = this.getBranchThoughts(graph, branch1);
    const thoughts2 = this.getBranchThoughts(graph, branch2);
    
    const contradictionPoints = this.contradictionDetector.detectContradictions(
      thoughts1,
      thoughts2
    );

    if (contradictionPoints.length === 0) {
      return null;
    }

    return {
      branch1Id: branch1.id,
      branch2Id: branch2.id,
      contradictionPoints,
      confidence: this.synthesisBuilder.calculateContradictionConfidence(contradictionPoints)
    };
  }

  /**
   * Create synthesis branch
   */
  private async createSynthesis(
    graph: BranchGraph,
    branch1: BranchNode,
    branch2: BranchNode,
    contradiction: Contradiction
  ): Promise<string> {
    const resolutionType = this.resolutionGenerator.determineResolutionType(
      contradiction.contradictionPoints
    );
    
    const synthesisBranchId = this.synthesisBuilder.generateBranchId(
      branch1.id,
      branch2.id
    );

    // Add introduction
    await this.addSynthesisThought(graph, synthesisBranchId, {
      content: this.synthesisBuilder.generateIntroduction(branch1, branch2, resolutionType),
      confidence: 0.9,
      keyPoints: ['dialectical synthesis', resolutionType, 'contradiction resolution']
    });

    // Add resolutions
    const resolutions = this.resolutionGenerator.generateResolutions(
      contradiction.contradictionPoints,
      resolutionType
    );

    for (const resolution of resolutions) {
      await this.addSynthesisThought(graph, synthesisBranchId, resolution);
    }

    // Add conclusion
    await this.addSynthesisThought(graph, synthesisBranchId, {
      content: this.synthesisBuilder.generateConclusion(resolutionType),
      confidence: 0.85,
      keyPoints: ['integrated understanding', 'synthesis complete']
    });

    return synthesisBranchId;
  }

  /**
   * Add thought to synthesis branch
   */
  private async addSynthesisThought(
    graph: BranchGraph,
    branchId: string,
    thought: {
      content: string;
      confidence: number;
      keyPoints: string[];
    }
  ): Promise<void> {
    await graph.addThought({
      content: thought.content,
      branchId,
      type: 'synthesis',
      confidence: thought.confidence,
      keyPoints: thought.keyPoints
    });
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

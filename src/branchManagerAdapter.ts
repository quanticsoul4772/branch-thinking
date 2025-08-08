import { BranchGraph } from './branchGraph.js';
import { DifferentialEvaluator, EvaluationResult } from './differentialEvaluator.js';
import { 
  BranchingThoughtInput, 
  ThoughtData, 
  ThoughtBranch,
  AutoEvaluationConfig,
  EvaluationFeedback
} from './types.js';
import { getConfig } from './config.js';
import { CounterfactualGenerator } from './counterfactualGenerator.js';
import { KnowledgeGapDetector } from './knowledgeGapDetector.js';
import { DialecticalSynthesizer } from './dialecticalSynthesizer.js';

// Helper classes
import { EvaluationHelper } from './utils/EvaluationHelper.js';
import { SerializationHelper } from './utils/SerializationHelper.js';
import { FormattingHelper } from './utils/FormattingHelper.js';
import { StatisticsHelper } from './utils/StatisticsHelper.js';
import { BranchOperationsHelper } from './utils/BranchOperationsHelper.js';
import { AnalysisHelper } from './utils/AnalysisHelper.js';
import { SemanticOperationsHelper } from './utils/SemanticOperationsHelper.js';

/**
 * Adapter to make the new graph-based implementation compatible with the existing MCP interface
 */
export class BranchManagerAdapter {
  private graph: BranchGraph;
  private evaluator: DifferentialEvaluator;
  private activeBranchId: string | null = null;
  private goal: string | null = null;
  private autoEvalConfig: AutoEvaluationConfig = getConfig().autoEvaluation;
  
  // Stage 2: Core reasoning modules
  private counterfactualGenerator: CounterfactualGenerator;
  private knowledgeGapDetector: KnowledgeGapDetector;
  private dialecticalSynthesizer: DialecticalSynthesizer;
  
  // Helper classes
  private evaluationHelper: EvaluationHelper;
  private serializationHelper: SerializationHelper;
  private formattingHelper: FormattingHelper;
  private statisticsHelper: StatisticsHelper;
  private branchOpsHelper: BranchOperationsHelper;
  private analysisHelper: AnalysisHelper;
  private semanticOpsHelper: SemanticOperationsHelper;
  
  constructor() {
    this.graph = new BranchGraph();
    this.evaluator = new DifferentialEvaluator();
    
    // Initialize Stage 2 modules
    this.counterfactualGenerator = new CounterfactualGenerator();
    this.knowledgeGapDetector = new KnowledgeGapDetector();
    this.dialecticalSynthesizer = new DialecticalSynthesizer();
    
    // Initialize helpers
    this.evaluationHelper = new EvaluationHelper(this.goal);
    this.serializationHelper = new SerializationHelper();
    this.formattingHelper = new FormattingHelper();
    this.statisticsHelper = new StatisticsHelper();
    this.branchOpsHelper = new BranchOperationsHelper();
    this.analysisHelper = new AnalysisHelper();
    this.semanticOpsHelper = new SemanticOperationsHelper(this.formattingHelper);
  }
  
  /**
   * Add a thought (main interface method)
   */
  async addThought(input: BranchingThoughtInput): Promise<{ thought: ThoughtData; feedback?: EvaluationFeedback }> {
    const actualBranchId = this.branchOpsHelper.resolveBranchId(
      this.graph, 
      input.branchId, 
      this.activeBranchId
    );
    
    // The graph's addThought method will handle branch creation with the correct ID
    const addResult = await this.graph.addThought({ ...input, branchId: actualBranchId });
    const thought = this.graph.getThought(addResult.thoughtId);
    if (!thought) {
      throw new Error(`Thought ${addResult.thoughtId} not found`);
    }
    
    // Set as active branch
    this.activeBranchId = actualBranchId;
    
    // Auto-evaluate if enabled
    const result: { thought: ThoughtData; feedback?: EvaluationFeedback } = { thought };
    if (this.autoEvalConfig.enabled) {
      result.feedback = await this.performAutoEvaluation(actualBranchId);
    }
    
    return result;
  }

  /**
   * Perform auto-evaluation
   */
  private async performAutoEvaluation(branchId: string): Promise<EvaluationFeedback> {
    const evaluation = await this.evaluator.evaluateIncremental(this.graph, branchId);
    const feedback = this.evaluationHelper.generateFeedback(evaluation, this.autoEvalConfig);
    
    // Update branch state if needed
    const newState = this.evaluationHelper.determineBranchState(evaluation);
    if (newState) {
      const branch = this.graph.getBranch(branchId);
      if (branch) {
        branch.state = newState;
      }
    }
    
    return feedback;
  }
  
  /**
   * Get branch (returns legacy format for compatibility)
   */
  getBranch(branchId: string): ThoughtBranch | undefined {
    return this.branchOpsHelper.getBranch(this.graph, branchId);
  }
  
  /**
   * Get all branches
   */
  getAllBranches(): ThoughtBranch[] {
    return this.branchOpsHelper.getAllBranches(this.graph);
  }
  
  /**
   * Get active branch
   */
  getActiveBranch(): ThoughtBranch | undefined {
    return this.branchOpsHelper.getActiveBranch(this.graph, this.activeBranchId);
  }
  
  /**
   * Set active branch
   */
  setActiveBranch(branchId: string): void {
    this.branchOpsHelper.setActiveBranch(this.graph, branchId);
    this.activeBranchId = branchId;
  }
  
  /**
   * Set goal
   */
  setGoal(goal: string): void {
    this.goal = goal;
    this.evaluator.setGoal(goal);
    this.evaluationHelper.setGoal(goal);
  }
  
  /**
   * Get goal
   */
  getGoal(): string | null {
    return this.goal;
  }
  
  /**
   * Evaluate branch
   */
  async evaluateBranch(branchId: string): Promise<EvaluationResult | null> {
    const branch = this.graph.getBranch(branchId);
    if (!branch) {
      return null;
    }
    
    return await this.evaluator.evaluateIncremental(this.graph, branchId);
  }
  
  /**
   * Get/set auto-evaluation config
   */
  getAutoEvaluationConfig(): AutoEvaluationConfig {
    return this.autoEvalConfig;
  }
  
  setAutoEvaluationConfig(config: Partial<AutoEvaluationConfig>): void {
    this.autoEvalConfig = { ...this.autoEvalConfig, ...config };
  }
  
  /**
   * Get branch history
   */
  getBranchHistory(branchId: string): any {
    const { branch, thoughts } = this.branchOpsHelper.getBranchHistory(this.graph, branchId);
    return this.formattingHelper.formatBranchHistory(branchId, branch, thoughts);
  }
  
  /**
   * Format branch status
   */
  formatBranchStatus(branch: ThoughtBranch | null | undefined): any {
    return this.formattingHelper.formatBranchStatus(branch, this.activeBranchId);
  }
  
  /**
   * Get reasoning statistics
   */
  getReasoningStatistics(): any {
    return this.statisticsHelper.getReasoningStatistics(this.graph, this.activeBranchId);
  }
  
  /**
   * Find contradictions
   */
  async findContradictions(): Promise<Array<{branch1: string, branch2: string, reason: string}>> {
    return this.analysisHelper.findContradictions(this.graph, this.evaluator);
  }
  
  /**
   * Find strongest paths
   */
  async findStrongestPaths(targetConclusion: string): Promise<ThoughtBranch[]> {
    return this.analysisHelper.findStrongestPaths(
      this.graph, 
      this.evaluator, 
      targetConclusion, 
      this.goal
    );
  }
  
  /**
   * Detect circular reasoning
   */
  detectCircularReasoning(): Array<{path: string[], branch: string}> {
    return this.analysisHelper.detectCircularReasoning(this.graph);
  }
  
  /**
   * Prune low-scoring branches
   */
  async pruneLowScoringBranches(threshold?: number): Promise<number> {
    return this.analysisHelper.pruneLowScoringBranches(
      this.graph, 
      this.evaluator, 
      threshold
    );
  }
  
  /**
   * Export for memory
   */
  exportForMemory(): { entities: any[], relations: any[] } {
    return this.serializationHelper.exportForMemory(this.graph, this.activeBranchId);
  }
  
  /**
   * Import from memory
   */
  async importFromMemory(data: { entities: any[], relations: any[] }): Promise<void> {
    // Clear current state
    this.graph = new BranchGraph();
    this.evaluator = new DifferentialEvaluator();
    this.activeBranchId = null;
    
    // Import data
    const result = await this.serializationHelper.importFromMemory(this.graph, data);
    this.activeBranchId = result.activeBranchId;
  }
  
  /**
   * Suggest tools (stub for compatibility)
   */
  suggestTools(branchId?: string): Array<{name: string; reason: string; confidence: number}> | null {
    // Return empty array for now
    return [];
  }
  
  /**
   * Compare semantic profiles
   */
  async compareProfiles(): Promise<any> {
    return this.semanticOpsHelper.compareProfiles(this.graph);
  }
  
  /**
   * Suggest merges
   */
  async suggestMerges(): Promise<any> {
    return this.semanticOpsHelper.suggestMerges(this.graph);
  }
  
  /**
   * Detect drift
   */
  async detectDrift(): Promise<any> {
    return this.semanticOpsHelper.detectDrift(this.graph);
  }
  
  /**
   * Generate counterfactuals
   */
  async generateCounterfactuals(branchId?: string): Promise<{
    scenarios: string[];
    message: string;
  }> {
    const targetBranchId = branchId || this.activeBranchId;
    
    if (!targetBranchId) {
      return {
        scenarios: [],
        message: 'No branch specified and no active branch'
      };
    }
    
    try {
      const newBranchIds = await this.counterfactualGenerator.generateCounterfactuals(
        this.graph,
        targetBranchId
      );
      
      return {
        scenarios: newBranchIds,
        message: `Generated ${newBranchIds.length} counterfactual scenarios from branch ${targetBranchId}`
      };
    } catch (error) {
      return {
        scenarios: [],
        message: `Error generating counterfactuals: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Detect knowledge gaps
   */
  async detectKnowledgeGaps(branchId?: string): Promise<{
    gaps: Array<{
      type: 'missing_data' | 'uncertain_claim' | 'vague_reference' | 'assumed_knowledge';
      description: string;
      suggestedAction: string;
      confidence: number;
    }>;
    totalGaps: number;
  }> {
    const targetBranchId = branchId || this.activeBranchId;
    
    if (!targetBranchId || !this.graph.getBranch(targetBranchId)) {
      return { gaps: [], totalGaps: 0 };
    }
    
    const gaps = await this.knowledgeGapDetector.detectGaps(this.graph, targetBranchId);
    
    return {
      gaps: gaps.map(gap => this.formattingHelper.formatKnowledgeGap(gap)),
      totalGaps: gaps.length
    };
  }
  
  /**
   * Synthesize dialectical
   */
  async synthesizeDialectical(branch1Id: string, branch2Id?: string): Promise<{
    synthesis: {
      thesis: string;
      antithesis: string;
      synthesis: string;
      newBranchId?: string;
    } | null;
    message: string;
  }> {
    // Find target branch for dialectical synthesis
    let targetBranch2Id = branch2Id;
    
    if (!targetBranch2Id) {
      const contradictions = await this.findContradictions();
      const relevantContradiction = contradictions.find(c => 
        c.branch1 === branch1Id || c.branch2 === branch1Id
      );
      
      if (relevantContradiction) {
        targetBranch2Id = relevantContradiction.branch1 === branch1Id 
          ? relevantContradiction.branch2 
          : relevantContradiction.branch1;
      }
    }
    
    if (!targetBranch2Id || targetBranch2Id === branch1Id) {
      return {
        synthesis: null,
        message: 'Could not find a suitable branch for dialectical synthesis'
      };
    }
    
    try {
      const result = await this.dialecticalSynthesizer.synthesizeBranches(
        this.graph,
        branch1Id,
        targetBranch2Id
      );
      
      const synthesisBranch = this.graph.getBranch(result.synthesisBranchId);
      if (!synthesisBranch) {
        return {
          synthesis: null,
          message: 'Failed to create synthesis branch'
        };
      }
      
      const thoughts = this.branchOpsHelper.getBranchThoughts(this.graph, synthesisBranch);
      
      return {
        synthesis: {
          thesis: `Branch ${branch1Id} perspective`,
          antithesis: `Branch ${targetBranch2Id} perspective`,
          synthesis: thoughts.map(t => t.content).join(' '),
          newBranchId: result.synthesisBranchId
        },
        message: `Successfully created ${result.resolutionType} synthesis with confidence ${result.confidence.toFixed(2)}`
      };
    } catch (error) {
      return {
        synthesis: null,
        message: `Error during synthesis: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Find similar thoughts
   */
  async findSimilar(query: string, limit: number = 10): Promise<{
    results: Array<{
      thoughtId: string;
      content: string;
      branchId: string;
      similarity: number;
      type: string;
    }>;
    totalFound: number;
  }> {
    return this.semanticOpsHelper.findSimilar(this.graph, query, limit);
  }
  
  /**
   * Jump to related thoughts
   */
  async jumpToRelated(thoughtId: string, limit: number = 5): Promise<{
    related: Array<{
      thoughtId: string;
      content: string;
      branchId: string;
      similarity: number;
      relationship: string;
    }>;
    message: string;
  }> {
    return this.semanticOpsHelper.jumpToRelated(this.graph, thoughtId, limit);
  }
  
  /**
   * Find semantic path
   */
  async semanticPath(fromThoughtId: string, toThoughtId: string): Promise<{
    path: Array<{
      thoughtId: string;
      content: string;
      branchId: string;
      similarity: number;
    }>;
    totalDistance: number;
    message: string;
  }> {
    return this.semanticOpsHelper.semanticPath(this.graph, fromThoughtId, toThoughtId);
  }
}

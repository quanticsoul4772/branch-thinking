import { BranchGraph } from './branchGraph.js';
import { ThoughtEvent, EvaluationDelta, ThoughtData } from './types.js';
import { getConfig } from './config.js';
import { semanticSimilarity } from './semanticSimilarity.js';

export interface EvaluationResult {
  coherenceScore: number;
  contradictionScore: number;
  informationGain: number;
  goalAlignment: number;
  confidenceGradient: number;
  redundancyScore: number;
  overallScore: number;
}

/**
 * Similarity cache with LRU eviction
 */
export class SimilarityCache {
  private cache: Map<string, number> = new Map();
  private accessOrder: string[] = [];
  private maxSize: number;
  
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }
  
  generateKey(text1: string, text2: string): string {
    // Ensure consistent key regardless of order
    return text1 < text2 ? `${text1}|${text2}` : `${text2}|${text1}`;
  }
  
  get(text1: string, text2: string): number | undefined {
    const key = this.generateKey(text1, text2);
    const value = this.cache.get(key);
    
    if (value !== undefined) {
      // Update access order
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      this.accessOrder.push(key);
    }
    
    return value;
  }
  
  set(text1: string, text2: string, similarity: number): void {
    const key = this.generateKey(text1, text2);
    
    // Check if we need to evict
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const lru = this.accessOrder.shift();
      if (lru) {
        this.cache.delete(lru);
      }
    }
    
    this.cache.set(key, similarity);
    this.accessOrder.push(key);
  }
}

/**
 * Helper class for metric calculations
 */
class MetricCalculator {
  constructor(
    private similarityCache: SimilarityCache,
    private stopwords: Set<string>,
    private termCache: Map<string, Set<string>>
  ) {}

  async calculateCoherence(thought: ThoughtData, recentThoughts: ThoughtData[]): Promise<number> {
    if (recentThoughts.length === 0) {
      return 1.0;
    }

    let coherenceSum = 0;
    for (const recentThought of recentThoughts) {
      let similarity = this.similarityCache.get(thought.content, recentThought.content);
      if (similarity === undefined) {
        similarity = await semanticSimilarity.calculateSimilarity(thought.content, recentThought.content);
        this.similarityCache.set(thought.content, recentThought.content, similarity);
      }
      coherenceSum += similarity;
    }
    
    return coherenceSum / recentThoughts.length;
  }

  calculateContradictionRate(thought: ThoughtData, recentThoughts: ThoughtData[]): number {
    if (recentThoughts.length === 0) {
      return 0;
    }

    let contradictionCount = 0;
    for (const recentThought of recentThoughts) {
      if (this.detectContradiction(thought.content, recentThought.content)) {
        contradictionCount++;
      }
    }
    
    return contradictionCount / recentThoughts.length;
  }

  private detectContradiction(text1: string, text2: string): boolean {
    const negationPatterns = [
      /not\s+/i, /never\s+/i, /disagree/i,
      /however/i, /but\s+/i, /contrary/i
    ];
    
    for (const pattern of negationPatterns) {
      if ((pattern.test(text1) && !pattern.test(text2)) || 
          (!pattern.test(text1) && pattern.test(text2))) {
        const terms1 = this.getTerms(text1);
        const terms2 = this.getTerms(text2);
        const commonTerms = [...terms1].filter(t => terms2.has(t));
        if (commonTerms.length > 2) {
          return true;
        }
      }
    }
    
    return false;
  }

  calculateInformationGain(newContent: string, recentThoughts: ThoughtData[]): number {
    const newTerms = this.getTerms(newContent);
    const existingTerms = new Set<string>();
    
    for (const thought of recentThoughts) {
      const terms = this.getTerms(thought.content);
      terms.forEach(t => existingTerms.add(t));
    }
    
    const uniqueNewTerms = [...newTerms].filter(t => !existingTerms.has(t));
    return newTerms.size > 0 ? uniqueNewTerms.length / newTerms.size : 1.0;
  }

  async calculateRedundancy(newContent: string, recentThoughts: ThoughtData[]): Promise<number> {
    for (const thought of recentThoughts) {
      const similarity = await semanticSimilarity.calculateSimilarity(newContent, thought.content);
      if (similarity > getConfig().evaluation.thresholds.similarity) {
        return 1;
      }
    }
    return 0;
  }

  calculateGoalAlignment(thoughts: ThoughtData[], goal: string | null): number {
    if (!goal) {
      return 0.5;
    }

    const goalTerms = this.getTerms(goal);
    const branchTerms = new Set<string>();
    
    for (const thought of thoughts.slice(-10)) {
      this.getTerms(thought.content).forEach(t => branchTerms.add(t));
    }
    
    const commonTerms = [...goalTerms].filter(t => branchTerms.has(t));
    return goalTerms.size > 0 ? commonTerms.length / goalTerms.size : 0;
  }

  calculateConfidenceGradient(thoughts: ThoughtData[]): number {
    if (thoughts.length < 2) {
      return 0;
    }

    const recentConfidences = thoughts.slice(-5).map(t => t.metadata.confidence);
    let gradient = 0;
    
    for (let i = 1; i < recentConfidences.length; i++) {
      gradient += recentConfidences[i] - recentConfidences[i-1];
    }
    
    return gradient / (recentConfidences.length - 1);
  }

  private getTerms(text: string): Set<string> {
    if (this.termCache.has(text)) {
      return this.termCache.get(text)!;
    }
    
    const terms = new Set(
      text.toLowerCase()
        .split(/\s+/)
        .map(w => w.replace(/[^a-z0-9]/gi, ''))
        .filter(w => w.length > 2 && !this.stopwords.has(w))
    );
    
    this.termCache.set(text, terms);
    return terms;
  }
}

/**
 * Differential evaluator that only processes changes
 */
export class DifferentialEvaluator {
  private evaluationCache: Map<string, EvaluationResult> = new Map();
  private deltaCache: Map<string, EvaluationDelta[]> = new Map();
  private lastProcessedEvent = 0;
  private similarityCache: SimilarityCache;
  private goal: string | null = null;
  private initialized = false;
  
  // Cached computations
  private termCache: Map<string, Set<string>> = new Map();
  private stopwords = getConfig().text.stopwords;
  private metricCalculator: MetricCalculator;
  
  constructor(cacheSize = 1000) {
    this.similarityCache = new SimilarityCache(cacheSize);
    this.metricCalculator = new MetricCalculator(
      this.similarityCache,
      this.stopwords,
      this.termCache
    );
  }
  
  setGoal(goal: string): void {
    this.goal = goal;
    // Invalidate goal-related caches
    this.evaluationCache.clear();
  }
  
  /**
   * Evaluate incrementally based on new events
   */
  async evaluateIncremental(graph: BranchGraph, branchId: string): Promise<EvaluationResult> {
    // Initialize semantic model if not done
    if (!this.initialized) {
      await semanticSimilarity.initialize();
      this.initialized = true;
    }
    
    const events = graph.getEventsSince(this.lastProcessedEvent);
    const relevantEvents = this.filterRelevantEvents(events, branchId);
    
    if (relevantEvents.length === 0 && this.evaluationCache.has(branchId)) {
      return this.evaluationCache.get(branchId)!;
    }
    
    // Process new events
    const deltas = await this.processEvents(relevantEvents, graph, branchId);
    
    // Get or create base evaluation
    let result = this.evaluationCache.get(branchId) || this.createEmptyResult();
    
    // Apply deltas
    result = this.applyDeltas(result, deltas, graph, branchId);
    
    // Cache result
    this.evaluationCache.set(branchId, result);
    this.lastProcessedEvent = Math.max(...events.map(e => e.index), this.lastProcessedEvent);
    
    return result;
  }

  private filterRelevantEvents(events: ThoughtEvent[], branchId: string): ThoughtEvent[] {
    return events.filter(e => 
      e.branchId === branchId || 
      (e.type === 'cross_ref_added' && e.data?.fromBranch === branchId)
    );
  }

  private async processEvents(events: ThoughtEvent[], graph: BranchGraph, branchId: string): Promise<EvaluationDelta[]> {
    const deltas: EvaluationDelta[] = [];
    for (const event of events) {
      const delta = await this.processEvent(event, graph, branchId);
      if (delta) {
        deltas.push(delta);
      }
    }
    return deltas;
  }
  
  /**
   * Process a single event into an evaluation delta
   */
  private async processEvent(event: ThoughtEvent, graph: BranchGraph, branchId: string): Promise<EvaluationDelta | null> {
    switch (event.type) {
    case 'thought_added':
      if (event.branchId === branchId && event.thoughtId) {
        return await this.evaluateNewThought(event.thoughtId, graph, branchId);
      }
      break;
    }
    return null;
  }
  
  /**
   * Evaluate a new thought's impact
   */
  private async evaluateNewThought(thoughtId: string, graph: BranchGraph, branchId: string): Promise<EvaluationDelta> {
    const thoughtContext = this.getThoughtContext(thoughtId, graph, branchId);
    if (!thoughtContext) {
      return { thoughtId, coherenceUpdate: 0, contradictionUpdate: 0 };
    }
    
    const { thought, recentThoughts } = thoughtContext;
    
    // Calculate incremental metrics
    const coherenceUpdate = await this.metricCalculator.calculateCoherence(thought, recentThoughts);
    const contradictionUpdate = this.metricCalculator.calculateContradictionRate(thought, recentThoughts);
    const informationGainUpdate = this.metricCalculator.calculateInformationGain(thought.content, recentThoughts);
    const redundancyUpdate = await this.metricCalculator.calculateRedundancy(thought.content, recentThoughts);
    
    return {
      thoughtId,
      coherenceUpdate,
      contradictionUpdate,
      informationGainUpdate,
      redundancyUpdate
    };
  }

  private getThoughtContext(thoughtId: string, graph: BranchGraph, branchId: string): { thought: ThoughtData, recentThoughts: ThoughtData[] } | null {
    const thought = graph.getThought(thoughtId);
    if (!thought) {
      return null;
    }
    
    const branch = graph.getBranch(branchId);
    if (!branch) {
      return null;
    }
    
    const thoughtIndex = branch.thoughtIds.indexOf(thoughtId);
    if (thoughtIndex === -1) {
      return null;
    }
    
    // Only compare with thoughts that came BEFORE this one
    const previousThoughtIds = branch.thoughtIds.slice(0, thoughtIndex);
    const recentPreviousIds = previousThoughtIds.slice(-5); // Last 5 thoughts before this one
    
    const recentThoughts = recentPreviousIds
      .map(id => graph.getThought(id))
      .filter((t: any): t is ThoughtData => t !== undefined);
    
    return { thought, recentThoughts };
  }
  
  /**
   * Apply deltas to existing evaluation
   */
  private applyDeltas(
    base: EvaluationResult, 
    deltas: EvaluationDelta[], 
    graph: BranchGraph,
    branchId: string
  ): EvaluationResult {
    if (deltas.length === 0) {
      return base;
    }
    
    const branch = graph.getBranch(branchId);
    if (!branch) {
      return base;
    }
    
    const aggregatedMetrics = this.aggregateMetrics(base, deltas, branch);
    const thoughts = this.getBranchThoughts(branch, graph);
    
    // Calculate additional metrics
    const confidenceGradient = this.metricCalculator.calculateConfidenceGradient(thoughts);
    const goalAlignment = this.metricCalculator.calculateGoalAlignment(thoughts, this.goal);
    
    // Calculate overall score
    const overallScore = this.calculateOverallScore({
      ...aggregatedMetrics,
      confidenceGradient,
      goalAlignment
    });
    
    return {
      coherenceScore: aggregatedMetrics.coherenceScore ?? 1.0,
      contradictionScore: aggregatedMetrics.contradictionScore ?? 0,
      informationGain: aggregatedMetrics.informationGain ?? 1.0,
      redundancyScore: aggregatedMetrics.redundancyScore ?? 0,
      confidenceGradient,
      goalAlignment,
      overallScore
    };
  }

  private aggregateMetrics(base: EvaluationResult, deltas: EvaluationDelta[], branch: any): Partial<EvaluationResult> {
    const totalThoughts = branch.thoughtIds.length;
    const newThoughts = deltas.length;
    const weight = totalThoughts > 0 ? (totalThoughts - newThoughts) / totalThoughts : 0;
    
    let coherenceSum = base.coherenceScore * weight;
    let contradictionSum = base.contradictionScore * weight;
    let infoGainSum = base.informationGain * weight;
    let redundancySum = base.redundancyScore * weight;
    
    // Add new deltas
    for (const delta of deltas) {
      const deltaWeight = 1 / totalThoughts;
      coherenceSum += (delta.coherenceUpdate || 0) * deltaWeight;
      contradictionSum += (delta.contradictionUpdate || 0) * deltaWeight;
      infoGainSum += (delta.informationGainUpdate || 0) * deltaWeight;
      redundancySum += (delta.redundancyUpdate || 0) * deltaWeight;
    }
    
    return {
      coherenceScore: coherenceSum,
      contradictionScore: contradictionSum,
      informationGain: infoGainSum,
      redundancyScore: redundancySum
    };
  }

  private getBranchThoughts(branch: any, graph: BranchGraph): ThoughtData[] {
    return branch.thoughtIds
      .map((id: string) => graph.getThought(id))
      .filter((t: any): t is ThoughtData => t !== undefined);
  }

  private calculateOverallScore(metrics: Partial<EvaluationResult>): number {
    return (
      (metrics.coherenceScore || 0) * 0.2 +
      (1 - (metrics.contradictionScore || 0)) * 0.25 +
      (metrics.informationGain || 0) * 0.2 +
      (metrics.goalAlignment || 0) * 0.15 +
      (((metrics.confidenceGradient || 0) + 1) / 2) * 0.1 +
      (1 - (metrics.redundancyScore || 0)) * 0.1
    );
  }
  
  /**
   * Create empty evaluation result
   */
  private createEmptyResult(): EvaluationResult {
    return {
      coherenceScore: 1.0,
      contradictionScore: 0,
      informationGain: 1.0,
      goalAlignment: 0.5,
      confidenceGradient: 0,
      redundancyScore: 0,
      overallScore: 0.5
    };
  }
  
  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.evaluationCache.clear();
    this.deltaCache.clear();
    this.termCache.clear();
    this.lastProcessedEvent = 0;
  }
}

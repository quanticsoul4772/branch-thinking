// TODO: Manually review and replace hardcoded patterns with PATTERNS object
import { PATTERNS, PatternMatchers } from './config/patterns';
/**
 * Circular Reasoning Detector
 * Detects logical loops and circular dependencies in thought chains
 */

export interface CircularPattern {
  type: 'direct' | 'indirect' | 'premise' | 'conclusion';
  thoughtIds: string[];
  description: string;
  confidence: number;
}

interface LogicalComponents {
  premises: string[];
  conclusions: string[];
  dependencies: string[];
}

interface PathNode {
  node: string;
  path: string[];
}

export class CircularReasoningDetector {
  private premiseMap: Map<string, Set<string>>; // premise -> conclusions
  private conclusionMap: Map<string, Set<string>>; // conclusion -> premises
  private thoughtDependencies: Map<string, Set<string>>; // thought -> dependencies
  private thoughtContent: Map<string, string>; // thoughtId -> content

  constructor() {
    this.premiseMap = new Map();
    this.conclusionMap = new Map();
    this.thoughtDependencies = new Map();
    this.thoughtContent = new Map();
  }

  /**
   * Extract logical components from thought content
   */
  private extractLogicalComponents(content: string): LogicalComponents {
    const normalized = content.toLowerCase();
    
    const premises = this.extractPremises(normalized);
    const conclusions = this.extractConclusions(normalized);
    const dependencies = this.extractDependencies(normalized);

    return { premises, conclusions, dependencies };
  }

  /**
   * Extract premises from normalized content
   */
  private extractPremises(normalized: string): string[] {
    const premisePatterns = [
      /(?:given|assuming|if|suppose|let's say|premise:)\s+([^,.]+)/g,
      /(?:based on|according to|from)\s+([^,.]+)/g,
      /(?:because|since|as)\s+([^,.]+)/g
    ];

    return this.extractMatches(normalized, premisePatterns);
  }

  /**
   * Extract conclusions from normalized content
   */
  private extractConclusions(normalized: string): string[] {
    const conclusionPatterns = [
      /(?:therefore|thus|hence|so|consequently)\s+([^,.]+)/g,
      /(?:this means|this shows|we can conclude)\s+([^,.]+)/g,
      /(?:proves|demonstrates|indicates)\s+([^,.]+)/g
    ];

    return this.extractMatches(normalized, conclusionPatterns);
  }

  /**
   * Extract dependencies from normalized content
   */
  private extractDependencies(normalized: string): string[] {
    const dependencyPatterns = [
      /(?:as shown in|see|refer to|from)\s+thought[- ]?(\w+)/g,
      /(?:building on|extending|following)\s+(\w+)/g
    ];

    return this.extractMatches(normalized, dependencyPatterns);
  }

  /**
   * Generic pattern matching extraction
   */
  private extractMatches(text: string, patterns: RegExp[]): string[] {
    const matches: string[] = [];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        matches.push(match[1].trim());
      }
    }

    return matches;
  }

  /**
   * Add a thought and analyze for circular patterns
   */
  addThought(thoughtId: string, content: string, referencedThoughts: string[] = []): void {
    this.thoughtContent.set(thoughtId, content);
    
    const { premises, conclusions, dependencies } = this.extractLogicalComponents(content);
    
    this.storePremises(thoughtId, premises);
    this.storeConclusions(thoughtId, conclusions);
    this.storeDependencies(thoughtId, dependencies, referencedThoughts);
  }

  /**
   * Store premises for a thought
   */
  private storePremises(thoughtId: string, premises: string[]): void {
    for (const premise of premises) {
      if (!this.premiseMap.has(premise)) {
        this.premiseMap.set(premise, new Set());
      }
      this.premiseMap.get(premise)!.add(thoughtId);
    }
  }

  /**
   * Store conclusions for a thought
   */
  private storeConclusions(thoughtId: string, conclusions: string[]): void {
    for (const conclusion of conclusions) {
      if (!this.conclusionMap.has(conclusion)) {
        this.conclusionMap.set(conclusion, new Set());
      }
      this.conclusionMap.get(conclusion)!.add(thoughtId);
    }
  }

  /**
   * Store dependencies for a thought
   */
  private storeDependencies(thoughtId: string, dependencies: string[], referencedThoughts: string[]): void {
    const allDeps = new Set([...dependencies, ...referencedThoughts]);
    this.thoughtDependencies.set(thoughtId, allDeps);
  }

  /**
   * Detect direct circular references (A -> B -> A)
   */
  detectDirectCircles(): CircularPattern[] {
    const patterns: CircularPattern[] = [];
    const visited = new Set<string>();

    for (const thoughtId of this.thoughtContent.keys()) {
      if (visited.has(thoughtId)) {
        continue;
      }
      
      const circlesFromThought = this.detectCirclesFromThought(thoughtId);
      patterns.push(...circlesFromThought);
      visited.add(thoughtId);
    }

    return patterns;
  }

  /**
   * Detect circles starting from a specific thought
   */
  private detectCirclesFromThought(startThought: string): CircularPattern[] {
    const patterns: CircularPattern[] = [];
    
    const dfs = (current: string, path: string[], visitedInPath: Set<string>): void => {
      const circle = this.checkForCircle(current, path, visitedInPath);
      if (circle) {
        patterns.push(this.createDirectCirclePattern(circle));
        return;
      }

      this.exploreDependencies(current, path, visitedInPath, dfs);
    };

    dfs(startThought, [], new Set());
    return patterns;
  }

  /**
   * Check if current node forms a circle
   */
  private checkForCircle(current: string, path: string[], visitedInPath: Set<string>): string[] | null {
    if (!visitedInPath.has(current)) {
      return null;
    }
    return this.extractCircle(current, path);
  }

  /**
   * Explore dependencies of current node
   */
  private exploreDependencies(
    current: string, 
    path: string[], 
    visitedInPath: Set<string>,
    dfs: (current: string, path: string[], visitedInPath: Set<string>) => void
  ): void {
    visitedInPath.add(current);
    const deps = this.thoughtDependencies.get(current) || new Set();

    for (const dep of deps) {
      if (this.thoughtContent.has(dep)) {
        dfs(dep, [...path, current], new Set(visitedInPath));
      }
    }
  }

  /**
   * Extract circle from path
   */
  private extractCircle(current: string, path: string[]): string[] {
    const circleStart = path.indexOf(current);
    const circle = path.slice(circleStart);
    circle.push(current);
    return circle;
  }

  /**
   * Create a direct circle pattern
   */
  private createDirectCirclePattern(circle: string[]): CircularPattern {
    return {
      type: 'direct',
      thoughtIds: circle,
      description: `Direct circular reference: ${circle.join(' → ')}`,
      confidence: 1.0
    };
  }

  /**
   * Detect premise-conclusion circles
   */
  detectPremiseConclusionCircles(): CircularPattern[] {
    const patterns: CircularPattern[] = [];

    for (const [premise, thoughtsWithPremise] of this.premiseMap) {
      const thoughtsWithConclusion = this.conclusionMap.get(premise) || new Set();
      const circlesForPremise = this.findPremiseConclusionCircles(
        premise, 
        thoughtsWithPremise, 
        thoughtsWithConclusion
      );
      patterns.push(...circlesForPremise);
    }

    return patterns;
  }

  /**
   * Find circles for a specific premise
   */
  private findPremiseConclusionCircles(
    premise: string,
    thoughtsWithPremise: Set<string>,
    thoughtsWithConclusion: Set<string>
  ): CircularPattern[] {
    const patterns: CircularPattern[] = [];

    for (const thought1 of thoughtsWithPremise) {
      const patternsForThought = this.findPatternsForThought(
        thought1,
        thoughtsWithConclusion
      );
      patterns.push(...patternsForThought);
    }

    return patterns;
  }

  /**
   * Find patterns for a specific thought
   */
  private findPatternsForThought(
    thought1: string,
    thoughtsWithConclusion: Set<string>
  ): CircularPattern[] {
    const patterns: CircularPattern[] = [];

    for (const thought2 of thoughtsWithConclusion) {
      if (thought1 === thought2) {
        continue;
      }
      
      const pattern = this.checkReciprocalRelationship(thought1, thought2);
      if (pattern) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Check for reciprocal premise-conclusion relationship
   */
  private checkReciprocalRelationship(thought1: string, thought2: string): CircularPattern | null {
    const content1 = this.thoughtContent.get(thought1)!;
    const content2 = this.thoughtContent.get(thought2)!;
    
    const { conclusions: conclusions1 } = this.extractLogicalComponents(content1);
    const { premises: premises2 } = this.extractLogicalComponents(content2);

    const hasReciprocal = this.hasReciprocalConcepts(conclusions1, premises2);

    if (!hasReciprocal) {
      return null;
    }

    return {
      type: 'premise',
      thoughtIds: [thought1, thought2],
      description: `Circular premise-conclusion: ${thought1} concludes what ${thought2} assumes`,
      confidence: 0.8
    };
  }

  /**
   * Check if conclusions and premises have reciprocal concepts
   */
  private hasReciprocalConcepts(conclusions: string[], premises: string[]): boolean {
    for (const conclusion of conclusions) {
      for (const premise of premises) {
        if (this.similarConcepts(conclusion, premise)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if two concepts are similar (simple similarity check)
   */
  private similarConcepts(concept1: string, concept2: string): boolean {
    const words1 = new Set(concept1.split(/\s+/));
    const words2 = new Set(concept2.split(/\s+/));
    
    const common = this.countCommonWords(words1, words2);
    const similarity = common / Math.max(words1.size, words2.size);
    
    return similarity > 0.5;
  }

  /**
   * Count common words between two sets
   */
  private countCommonWords(words1: Set<string>, words2: Set<string>): number {
    let common = 0;
    
    for (const word of words1) {
      if (words2.has(word) && word.length > 3) {
        common++;
      }
    }
    
    return common;
  }

  /**
   * Detect all circular patterns
   */
  detectAllPatterns(): CircularPattern[] {
    const directCircles = this.detectDirectCircles();
    const premiseCircles = this.detectPremiseConclusionCircles();
    const indirectCircles = this.detectIndirectCircles();

    return [...directCircles, ...premiseCircles, ...indirectCircles];
  }

  /**
   * Detect indirect circular reasoning through transitive closure
   */
  private detectIndirectCircles(): CircularPattern[] {
    const reachability = this.computeTransitiveClosure();
    return this.findIndirectCirclesFromReachability(reachability);
  }

  /**
   * Compute transitive closure using Floyd-Warshall
   */
  private computeTransitiveClosure(): Map<string, Set<string>> {
    const reachability = new Map<string, Set<string>>();

    // Initialize with empty sets
    for (const thoughtId of this.thoughtContent.keys()) {
      reachability.set(thoughtId, new Set());
    }

    // Initialize with direct dependencies
    this.initializeDirectDependencies(reachability);

    // Compute transitive closure
    this.computeFloydWarshall(reachability);

    return reachability;
  }

  /**
   * Initialize reachability with direct dependencies
   */
  private initializeDirectDependencies(reachability: Map<string, Set<string>>): void {
    for (const [thought, deps] of this.thoughtDependencies) {
      for (const dep of deps) {
        if (this.thoughtContent.has(dep)) {
          reachability.get(thought)!.add(dep);
        }
      }
    }
  }

  /**
   * Compute Floyd-Warshall algorithm
   */
  private computeFloydWarshall(reachability: Map<string, Set<string>>): void {
    const thoughts = Array.from(this.thoughtContent.keys());

    for (const k of thoughts) {
      this.updateReachabilityThroughNode(reachability, thoughts, k);
    }
  }

  /**
   * Update reachability through a specific node
   */
  private updateReachabilityThroughNode(
    reachability: Map<string, Set<string>>,
    thoughts: string[],
    k: string
  ): void {
    for (const i of thoughts) {
      for (const j of thoughts) {
        if (this.canReachThrough(reachability, i, j, k)) {
          reachability.get(i)!.add(j);
        }
      }
    }
  }

  /**
   * Check if i can reach j through k
   */
  private canReachThrough(
    reachability: Map<string, Set<string>>,
    i: string,
    j: string,
    k: string
  ): boolean {
    return reachability.get(i)!.has(k) && reachability.get(k)!.has(j);
  }

  /**
   * Find indirect circles from reachability matrix
   */
  private findIndirectCirclesFromReachability(reachability: Map<string, Set<string>>): CircularPattern[] {
    const patterns: CircularPattern[] = [];

    for (const [thought, reachable] of reachability) {
      if (!reachable.has(thought)) {
        continue;
      }

      const pattern = this.createIndirectPattern(thought);
      if (pattern) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Create indirect circle pattern
   */
  private createIndirectPattern(thought: string): CircularPattern | null {
    const path = this.findPath(thought, thought);
    if (path.length <= 3) {
      return null;
    } // Skip direct circles

    return {
      type: 'indirect',
      thoughtIds: path,
      description: `Indirect circular reasoning through ${path.length - 1} steps`,
      confidence: 0.7
    };
  }

  /**
   * Find a path between two thoughts
   */
  private findPath(start: string, end: string): string[] {
    const queue: PathNode[] = [{node: start, path: [start]}];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      const pathFound = this.checkPathFound(current, end);
      if (pathFound) {
        return current.path;
      }

      if (visited.has(current.node)) {
        continue;
      }
      
      visited.add(current.node);
      this.expandPath(current, queue);
    }

    return [];
  }

  /**
   * Check if path to end is found
   */
  private checkPathFound(current: PathNode, end: string): boolean {
    return current.node === end && current.path.length > 1;
  }

  /**
   * Expand path by adding dependencies
   */
  private expandPath(current: PathNode, queue: PathNode[]): void {
    const deps = this.thoughtDependencies.get(current.node) || new Set();
    
    for (const dep of deps) {
      if (this.thoughtContent.has(dep)) {
        queue.push({
          node: dep, 
          path: [...current.path, dep]
        });
      }
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    const depValues = Array.from(this.thoughtDependencies.values());
    const thoughtsWithDeps = depValues.filter(deps => deps.size > 0).length;
    const totalDeps = depValues.reduce((sum, deps) => sum + deps.size, 0);
    
    return {
      totalThoughts: this.thoughtContent.size,
      totalPremises: this.premiseMap.size,
      totalConclusions: this.conclusionMap.size,
      thoughtsWithDependencies: thoughtsWithDeps,
      averageDependencies: this.thoughtContent.size > 0 ? totalDeps / this.thoughtContent.size : 0
    };
  }
}

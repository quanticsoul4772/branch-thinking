// Claude-optimized types for branch-thinking
// Focused on graph structures and efficient data access

export type BranchState = 'active' | 'suspended' | 'completed' | 'dead_end';
export type InsightType = 'behavioral_pattern' | 'feature_integration' | 'observation' | 'connection';
export type CrossRefType = 'complementary' | 'contradictory' | 'builds_upon' | 'alternative' | 'supports';

// Event types for event sourcing
export type EventType = 'thought_added' | 'branch_created' | 'cross_ref_added' | 'branch_state_changed' | 'evaluation_completed';

export interface ThoughtEvent {
  type: EventType;
  thoughtId?: string;
  branchId?: string;
  timestamp: number;
  index: number;
  data?: any;
}

// Optimized thought structure with content addressing
export interface ThoughtData {
  id: string; // Content hash
  content: string;
  branchId: string;
  timestamp: Date;
  metadata: {
    type: string;
    confidence: number;
    keyPoints: string[];
  };
}

// Processed text for caching
export interface ProcessedText {
  lower: string;
  terms: Set<string>;
  patterns: Map<string, boolean>;
}

// Evaluation delta for incremental updates
export interface EvaluationDelta {
  thoughtId: string;
  coherenceUpdate?: number;
  contradictionUpdate?: number;
  informationGainUpdate?: number;
  redundancyUpdate?: number;
}

// Graph structure for branches
export interface BranchNode {
  id: string;
  description?: string; // Human-readable description
  thoughtIds: string[]; // References to thought pool
  thoughts: ThoughtData[]; // Direct references for convenience
  parentId?: string;
  childIds: Set<string>;
  state: BranchState;
  priority: number;
  confidence: number;
  lastEvaluationIndex: number;
  // Phase 3: Semantic Profile
  semanticProfile?: {
    centerEmbedding: Float32Array;  // Average of all thought embeddings
    keywords: string[];             // Top TF-IDF keywords
    thoughtCount: number;           // Number of thoughts in average
    lastUpdated: Date;
  };
}

// Simplified insight without redundant data
export interface Insight {
  id: string;
  type: InsightType;
  content: string;
  thoughtId: string; // Reference to generating thought
  score: number;
}

// Cross-reference in graph format
export interface CrossReference {
  id: string;
  fromBranch: string;
  toBranch: string;
  type: CrossRefType;
  strength: number;
  thoughtPairs: Array<[string, string]>; // Thought ID pairs
}

// Main input interface remains similar for compatibility
export interface BranchingThoughtInput {
  content: string;
  branchId?: string;
  parentBranchId?: string;
  type: string;
  confidence?: number;
  keyPoints?: string[];
  crossRefs?: Array<{
    toBranch: string;
    type: CrossRefType;
    reason: string;
    strength: number;
  }>;
}

// Export/Import format for streaming
export interface ExportChunk {
  type: 'header' | 'thoughts' | 'branches' | 'relationships' | 'events';
  data: any;
}

export interface ExportHeader {
  version: string;
  thoughtCount: number;
  branchCount: number;
  exportDate: string;
  lastEventIndex: number;
}

// Configuration (simplified - no human-centric options)
export interface ClaudeConfig {
  evaluation: {
    windowSize: number;
    cacheSize: number;
    sparseThreshold: number;
  };
  graph: {
    maxBranchDepth: number;
    thoughtPoolSize: number;
  };
}

// Legacy types for compatibility (will be removed later)
export type BranchRole = 'explorer' | 'advocate' | 'skeptic' | 'synthesizer' | 'neutral';

export interface ThoughtBranch {
  id: string;
  parentBranchId?: string;
  state: BranchState;
  priority: number;
  confidence: number;
  thoughts: ThoughtData[];
  insights: Insight[];
  crossRefs: CrossReference[];
  role?: BranchRole;
  evaluation?: any;
}

// Auto-evaluation config (simplified)
export interface AutoEvaluationConfig {
  enabled: boolean;
  threshold: number;
}

export interface EvaluationFeedback {
  score: number;
  quality: 'excellent' | 'good' | 'moderate' | 'poor';
  issues: string[];
  suggestions: string[];
  shouldPivot: boolean;
}

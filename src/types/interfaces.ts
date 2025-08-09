/**
 * Type definitions to replace 'any' usage throughout the codebase
 */

// OpenAPI types
export interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
  };
}

// Evaluation types
export interface EvaluationMetrics {
  coherenceScore?: number;
  contradictionScore?: number;
  informationGain?: number;
  goalAlignment?: number;
  confidenceGradient?: number;
  redundancyScore?: number;
}

// Branch types for metrics
export interface BranchMetrics {
  thoughtIds: string[];
  id: string;
  state: string;
  priority: number;
  confidence: number;
}

// Knowledge gap types
export interface GapMatch {
  pattern: string;
  type: string;
  confidence: number;
  suggestedQuestions?: string[];
  relatedConcepts?: string[];
}

// Command types
export interface CommandParams {
  type: string;
  branchId?: string;
  data?: CommandData;
  goal?: string;
  query?: string;
}

export interface CommandData {
  threshold?: number;
  limit?: number;
  topK?: number;
  thoughtId?: string;
  fromThoughtId?: string;
  toThoughtId?: string;
  branchId?: string;
  branches?: string[];
  count?: number;
  enabled?: boolean;
  thresholds?: {
    excellent?: number;
    good?: number;
    moderate?: number;
  };
  suggestPivotThreshold?: number;
  [key: string]: any; // For extensibility
}

// Process types for stdout handling
export type ProcessWriteChunk = string | Uint8Array;

export type ProcessWriteEncoding = BufferEncoding | undefined;
export type ProcessWriteCallback = ((err?: Error | null) => void) | undefined;

// Evaluation input types
export interface EvaluationInput {
  coherenceScore: number;
  contradictionScore: number;
  informationGain: number;
  goalAlignment: number;
  confidenceGradient: number;
  redundancyScore: number;
  overallScore: number;
}

// Response types
export interface ThoughtResponse {
  thoughtId?: string;
  branchId: string;
  branchState: string;
  branchPriority: number;
  numThoughts: number;
  activeBranch: string;
  evaluation?: EvaluationInput;
  overlapWarning?: {
    suggestedBranch: string;
    currentSimilarity: number;
    suggestedSimilarity: number;
  };
}

// Config merge types
export interface ConfigValue {
  [key: string]: any;
}

// Console error arguments
export interface ErrorArg {
  name?: string;
  message?: string;
  stack?: string;
}
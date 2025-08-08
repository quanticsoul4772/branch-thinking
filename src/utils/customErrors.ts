/**
 * Custom error classes for branch-thinking MCP server
 */

export class BranchThinkingError extends Error {
  public readonly code: string;
  public readonly timestamp: Date;

  constructor(message: string, code: string = 'BRANCH_THINKING_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

export class ContradictionError extends BranchThinkingError {
  public readonly conflictingThoughts: string[];

  constructor(message: string, conflictingThoughts: string[] = []) {
    super(message, 'CONTRADICTION_DETECTED');
    this.conflictingThoughts = conflictingThoughts;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      conflictingThoughts: this.conflictingThoughts
    };
  }
}

export class CircularReferenceError extends BranchThinkingError {
  public readonly circularPath: string[];

  constructor(message: string, circularPath: string[] = []) {
    super(message, 'CIRCULAR_REFERENCE');
    this.circularPath = circularPath;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      circularPath: this.circularPath
    };
  }
}

export class ValidationError extends BranchThinkingError {
  public readonly field: string;
  public readonly value: unknown;

  constructor(message: string, field: string, value: unknown = null) {
    super(message, 'VALIDATION_ERROR');
    this.field = field;
    this.value = value;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      field: this.field,
      value: this.value
    };
  }
}

export class BranchNotFoundError extends BranchThinkingError {
  public readonly branchId: string;

  constructor(branchId: string) {
    super(`Branch with ID '${branchId}' not found`, 'BRANCH_NOT_FOUND');
    this.branchId = branchId;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      branchId: this.branchId
    };
  }
}

export class ThoughtNotFoundError extends BranchThinkingError {
  public readonly thoughtId: string;

  constructor(thoughtId: string) {
    super(`Thought with ID '${thoughtId}' not found`, 'THOUGHT_NOT_FOUND');
    this.thoughtId = thoughtId;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      thoughtId: this.thoughtId
    };
  }
}

export class SemanticAnalysisError extends BranchThinkingError {
  public readonly operation: string;

  constructor(message: string, operation: string) {
    super(message, 'SEMANTIC_ANALYSIS_ERROR');
    this.operation = operation;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      operation: this.operation
    };
  }
}

export class ConfigurationError extends BranchThinkingError {
  public readonly setting: string;

  constructor(message: string, setting: string) {
    super(message, 'CONFIGURATION_ERROR');
    this.setting = setting;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      setting: this.setting
    };
  }
}

export class EvaluationError extends BranchThinkingError {
  public readonly branchId?: string;
  public readonly thoughtId?: string;

  constructor(message: string, branchId?: string, thoughtId?: string) {
    super(message, 'EVALUATION_ERROR');
    if (branchId !== undefined) {
      this.branchId = branchId;
    }
    if (thoughtId !== undefined) {
      this.thoughtId = thoughtId;
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      branchId: this.branchId,
      thoughtId: this.thoughtId
    };
  }
}

/**
 * Error handler utility for consistent error processing
 */
export class ErrorHandler {
  static handle(error: unknown): BranchThinkingError {
    if (error instanceof BranchThinkingError) {
      return error;
    }

    if (error instanceof Error) {
      return new BranchThinkingError(
        error.message,
        'UNKNOWN_ERROR'
      );
    }

    return new BranchThinkingError(
      String(error),
      'UNKNOWN_ERROR'
    );
  }

  static isRecoverable(error: BranchThinkingError): boolean {
    const recoverableCodes = [
      'VALIDATION_ERROR',
      'BRANCH_NOT_FOUND',
      'THOUGHT_NOT_FOUND',
      'CONFIGURATION_ERROR'
    ];
    return recoverableCodes.includes(error.code);
  }
}

/**
 * Type guards for error detection
 */
export function isContradictionError(error: unknown): error is ContradictionError {
  return error instanceof ContradictionError;
}

export function isCircularReferenceError(error: unknown): error is CircularReferenceError {
  return error instanceof CircularReferenceError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isBranchNotFoundError(error: unknown): error is BranchNotFoundError {
  return error instanceof BranchNotFoundError;
}

export function isSemanticAnalysisError(error: unknown): error is SemanticAnalysisError {
  return error instanceof SemanticAnalysisError;
}
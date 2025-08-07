/**
 * Structured error system providing deterministic error objects
 * Returns consistent format: { ok: false, code: "ERROR_CODE", message: "...", retryable: boolean }
 */

export interface StructuredError {
  ok: false;
  code: string;
  message: string;
  retryable: boolean;
}

export interface StructuredSuccess<T = any> {
  ok: true;
  data: T;
}

export type StructuredResult<T = any> = StructuredSuccess<T> | StructuredError;

// Error codes enum for consistency
export enum StructuredErrorCode {
  // Input validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  INVALID_PARAMETER_TYPE = 'INVALID_PARAMETER_TYPE',
  
  // Resource not found errors
  BRANCH_NOT_FOUND = 'BRANCH_NOT_FOUND',
  THOUGHT_NOT_FOUND = 'THOUGHT_NOT_FOUND',
  COMMAND_NOT_FOUND = 'COMMAND_NOT_FOUND',
  
  // Business logic errors
  CIRCULAR_REFERENCE = 'CIRCULAR_REFERENCE',
  CONTRADICTION_DETECTED = 'CONTRADICTION_DETECTED',
  EVALUATION_FAILED = 'EVALUATION_FAILED',
  
  // Operation errors
  IMPORT_FAILED = 'IMPORT_FAILED',
  EXPORT_FAILED = 'EXPORT_FAILED',
  SEMANTIC_ANALYSIS_ERROR = 'SEMANTIC_ANALYSIS_ERROR',
  
  // System errors
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Error retryability mapping
const RETRYABLE_ERROR_CODES = new Set([
  StructuredErrorCode.INTERNAL_ERROR,
  StructuredErrorCode.SEMANTIC_ANALYSIS_ERROR,
  StructuredErrorCode.EVALUATION_FAILED
]);

export class StructuredErrorBuilder {
  static create(code: StructuredErrorCode, message: string, retryable?: boolean): StructuredError {
    return {
      ok: false,
      code,
      message,
      retryable: retryable ?? RETRYABLE_ERROR_CODES.has(code)
    };
  }

  // Specific error builders for common cases
  static invalidInput(message: string): StructuredError {
    return this.create(StructuredErrorCode.INVALID_INPUT, message, false);
  }

  static branchNotFound(branchId: string): StructuredError {
    return this.create(StructuredErrorCode.BRANCH_NOT_FOUND, `Branch not found: ${branchId}`, false);
  }

  static thoughtNotFound(thoughtId: string): StructuredError {
    return this.create(StructuredErrorCode.THOUGHT_NOT_FOUND, `Thought not found: ${thoughtId}`, false);
  }

  static circularReference(path: string[]): StructuredError {
    return this.create(
      StructuredErrorCode.CIRCULAR_REFERENCE, 
      `Circular reference detected in path: ${path.join(' -> ')}`, 
      false
    );
  }

  static contradictionDetected(details: string): StructuredError {
    return this.create(StructuredErrorCode.CONTRADICTION_DETECTED, `Contradiction detected: ${details}`, false);
  }

  static configurationError(setting: string, details: string): StructuredError {
    return this.create(
      StructuredErrorCode.CONFIGURATION_ERROR, 
      `Configuration error in ${setting}: ${details}`, 
      false
    );
  }

  static evaluationFailed(reason: string): StructuredError {
    return this.create(StructuredErrorCode.EVALUATION_FAILED, `Evaluation failed: ${reason}`, true);
  }

  static semanticAnalysisError(operation: string, reason: string): StructuredError {
    return this.create(
      StructuredErrorCode.SEMANTIC_ANALYSIS_ERROR, 
      `Semantic analysis failed during ${operation}: ${reason}`, 
      true
    );
  }

  static internalError(message: string = 'An internal error occurred'): StructuredError {
    return this.create(StructuredErrorCode.INTERNAL_ERROR, message, true);
  }

  static importFailed(reason: string): StructuredError {
    return this.create(StructuredErrorCode.IMPORT_FAILED, `Import failed: ${reason}`, false);
  }

  static exportFailed(reason: string): StructuredError {
    return this.create(StructuredErrorCode.EXPORT_FAILED, `Export failed: ${reason}`, false);
  }

  static commandNotFound(command: string, availableCommands?: string[]): StructuredError {
    let message = `Command not found: ${command}`;
    if (availableCommands?.length) {
      message += `. Available commands: ${availableCommands.join(', ')}`;
    }
    return this.create(StructuredErrorCode.COMMAND_NOT_FOUND, message, false);
  }

  // Convert from unknown error
  static fromError(error: unknown): StructuredError {
    if (error instanceof Error) {
      // Try to extract code from error message if it follows a pattern
      const codeMatch = error.message.match(/^([A-Z_]+):\s*(.*)/);
      if (codeMatch) {
        const [, code, message] = codeMatch;
        if (Object.values(StructuredErrorCode).includes(code as StructuredErrorCode)) {
          return this.create(code as StructuredErrorCode, message);
        }
      }
      return this.internalError(error.message);
    }
    
    return this.internalError(String(error));
  }
}

// Success result builder
export class StructuredResultBuilder {
  static success<T>(data: T): StructuredSuccess<T> {
    return {
      ok: true,
      data
    };
  }

  static error(code: StructuredErrorCode, message: string, retryable?: boolean): StructuredError {
    return StructuredErrorBuilder.create(code, message, retryable);
  }
}

// Type guards
export function isStructuredError(result: StructuredResult): result is StructuredError {
  return result.ok === false;
}

export function isStructuredSuccess<T>(result: StructuredResult<T>): result is StructuredSuccess<T> {
  return result.ok === true;
}

// Conversion utilities for MCP response format
export function toMCPResponse(result: StructuredResult): { content: Array<{ type: string; text: string }>; isError?: boolean } {
  if (isStructuredError(result)) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
      }],
      isError: true
    };
  }
  
  return {
    content: [{
      type: "text", 
      text: JSON.stringify(result.data, null, 2)
    }]
  };
}
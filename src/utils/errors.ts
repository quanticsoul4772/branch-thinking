export enum ErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  BRANCH_NOT_FOUND = 'BRANCH_NOT_FOUND',
  THOUGHT_NOT_FOUND = 'THOUGHT_NOT_FOUND',
  COMMAND_NOT_FOUND = 'COMMAND_NOT_FOUND',
  EVALUATION_FAILED = 'EVALUATION_FAILED',
  IMPORT_FAILED = 'IMPORT_FAILED',
  EXPORT_FAILED = 'EXPORT_FAILED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
      status: 'failed'
    };
  }
}

export function handleError(error: unknown): { content: Array<{ type: string; text: string }>; isError: boolean } {
  if (error instanceof AppError) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(error.toJSON(), null, 2)
      }],
      isError: true
    };
  }

  if (error instanceof Error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message,
          code: ErrorCode.INTERNAL_ERROR,
          status: 'failed'
        }, null, 2)
      }],
      isError: true
    };
  }

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        error: String(error),
        code: ErrorCode.INTERNAL_ERROR,
        status: 'failed'
      }, null, 2)
    }],
    isError: true
  };
}

export function assertDefined<T>(value: T | null | undefined, errorMessage: string): T {
  if (value === null || value === undefined) {
    throw new AppError(ErrorCode.INVALID_INPUT, errorMessage, 400);
  }
  return value;
}

export function assertBranchExists(branch: any, branchId: string): void {
  if (!branch) {
    throw new AppError(
      ErrorCode.BRANCH_NOT_FOUND,
      `Branch not found: ${branchId}`,
      404
    );
  }
}

export function assertThoughtExists(thought: any, thoughtId: string): void {
  if (!thought) {
    throw new AppError(
      ErrorCode.THOUGHT_NOT_FOUND,
      `Thought not found: ${thoughtId}`,
      404
    );
  }
}

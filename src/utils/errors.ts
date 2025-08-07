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
    public statusCode: number = 500,
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

import { StructuredErrorBuilder, toMCPResponse } from './structuredErrors.js';

export function handleError(error: unknown): { content: Array<{ type: string; text: string }>; isError: boolean } {
  if (error instanceof AppError) {
    // Convert legacy AppError to structured format
    const structuredError = StructuredErrorBuilder.create(
      error.code as any,
      error.message,
      error.statusCode >= 500 // Server errors are retryable
    );
    return toMCPResponse(structuredError);
  }

  // Handle any other error
  const structuredError = StructuredErrorBuilder.fromError(error);
  return toMCPResponse(structuredError);
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

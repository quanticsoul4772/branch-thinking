import { describe, it, expect } from 'vitest';
import {
  StructuredErrorBuilder,
  StructuredResultBuilder,
  StructuredErrorCode,
  isStructuredError,
  isStructuredSuccess,
  toMCPResponse
} from '../../utils/structuredErrors.js';

describe('StructuredErrors', () => {
  describe('StructuredErrorBuilder', () => {
    it('should create basic error with correct format', () => {
      const error = StructuredErrorBuilder.create(
        StructuredErrorCode.BRANCH_NOT_FOUND,
        'Test branch not found'
      );

      expect(error).toEqual({
        ok: false,
        code: 'BRANCH_NOT_FOUND',
        message: 'Test branch not found',
        retryable: false
      });
    });

    it('should set retryable flag based on error code', () => {
      const retryableError = StructuredErrorBuilder.create(
        StructuredErrorCode.INTERNAL_ERROR,
        'Internal error'
      );
      
      const nonRetryableError = StructuredErrorBuilder.create(
        StructuredErrorCode.BRANCH_NOT_FOUND,
        'Not found'
      );

      expect(retryableError.retryable).toBe(true);
      expect(nonRetryableError.retryable).toBe(false);
    });

    it('should override retryable flag when explicitly provided', () => {
      const error = StructuredErrorBuilder.create(
        StructuredErrorCode.INTERNAL_ERROR,
        'Error',
        false // Override to false
      );

      expect(error.retryable).toBe(false);
    });

    it('should create branch not found error', () => {
      const error = StructuredErrorBuilder.branchNotFound('test-branch');
      
      expect(error).toEqual({
        ok: false,
        code: 'BRANCH_NOT_FOUND',
        message: 'Branch not found: test-branch',
        retryable: false
      });
    });

    it('should create thought not found error', () => {
      const error = StructuredErrorBuilder.thoughtNotFound('test-thought');
      
      expect(error).toEqual({
        ok: false,
        code: 'THOUGHT_NOT_FOUND',
        message: 'Thought not found: test-thought',
        retryable: false
      });
    });

    it('should create circular reference error', () => {
      const path = ['A', 'B', 'C', 'A'];
      const error = StructuredErrorBuilder.circularReference(path);
      
      expect(error).toEqual({
        ok: false,
        code: 'CIRCULAR_REFERENCE',
        message: 'Circular reference detected in path: A -> B -> C -> A',
        retryable: false
      });
    });

    it('should create command not found error with suggestions', () => {
      const error = StructuredErrorBuilder.commandNotFound('badcmd', ['list', 'focus']);
      
      expect(error.code).toBe('COMMAND_NOT_FOUND');
      expect(error.message).toContain('Command not found: badcmd');
      expect(error.message).toContain('Available commands: list, focus');
      expect(error.retryable).toBe(false);
    });

    it('should convert from Error objects', () => {
      const jsError = new Error('Something went wrong');
      const error = StructuredErrorBuilder.fromError(jsError);
      
      expect(error).toEqual({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong',
        retryable: true
      });
    });

    it('should convert from non-Error objects', () => {
      const error = StructuredErrorBuilder.fromError('String error');
      
      expect(error).toEqual({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'String error',
        retryable: true
      });
    });

    it('should parse error codes from error messages', () => {
      const jsError = new Error('INVALID_INPUT: The input was malformed');
      const error = StructuredErrorBuilder.fromError(jsError);
      
      expect(error).toEqual({
        ok: false,
        code: 'INVALID_INPUT',
        message: 'The input was malformed',
        retryable: false
      });
    });
  });

  describe('StructuredResultBuilder', () => {
    it('should create success result', () => {
      const data = { id: 'test', value: 42 };
      const result = StructuredResultBuilder.success(data);
      
      expect(result).toEqual({
        ok: true,
        data: { id: 'test', value: 42 }
      });
    });

    it('should create error result', () => {
      const result = StructuredResultBuilder.error(
        StructuredErrorCode.VALIDATION_ERROR,
        'Validation failed'
      );
      
      expect(result).toEqual({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        retryable: false
      });
    });
  });

  describe('Type guards', () => {
    it('should identify structured errors', () => {
      const error = StructuredErrorBuilder.internalError('Test');
      const success = StructuredResultBuilder.success('data');
      
      expect(isStructuredError(error)).toBe(true);
      expect(isStructuredError(success)).toBe(false);
    });

    it('should identify structured success', () => {
      const error = StructuredErrorBuilder.internalError('Test');
      const success = StructuredResultBuilder.success('data');
      
      expect(isStructuredSuccess(success)).toBe(true);
      expect(isStructuredSuccess(error)).toBe(false);
    });
  });

  describe('MCP Response Conversion', () => {
    it('should convert error to MCP format', () => {
      const error = StructuredErrorBuilder.branchNotFound('test');
      const mcpResponse = toMCPResponse(error);
      
      expect(mcpResponse).toEqual({
        content: [{
          type: "text",
          text: JSON.stringify(error, null, 2)
        }],
        isError: true
      });
    });

    it('should convert success to MCP format', () => {
      const success = StructuredResultBuilder.success({ id: 'test' });
      const mcpResponse = toMCPResponse(success);
      
      expect(mcpResponse).toEqual({
        content: [{
          type: "text",
          text: JSON.stringify({ id: 'test' }, null, 2)
        }]
      });
    });
  });

  describe('Error Code Coverage', () => {
    it('should have all error codes represented in builders', () => {
      const codes = Object.values(StructuredErrorCode);
      const testedCodes = new Set([
        'INVALID_INPUT',
        'BRANCH_NOT_FOUND',
        'THOUGHT_NOT_FOUND',
        'COMMAND_NOT_FOUND',
        'CIRCULAR_REFERENCE',
        'CONTRADICTION_DETECTED',
        'EVALUATION_FAILED',
        'SEMANTIC_ANALYSIS_ERROR',
        'CONFIGURATION_ERROR',
        'INTERNAL_ERROR',
        'IMPORT_FAILED',
        'EXPORT_FAILED'
      ]);

      for (const code of codes) {
        expect(testedCodes.has(code) || 
               ['MISSING_PARAMETER', 'INVALID_PARAMETER_TYPE', 'UNKNOWN_ERROR'].includes(code)
        ).toBe(true);
      }
    });

    it('should test all specific error builders', () => {
      expect(StructuredErrorBuilder.invalidInput('test').code).toBe('INVALID_INPUT');
      expect(StructuredErrorBuilder.branchNotFound('id').code).toBe('BRANCH_NOT_FOUND');
      expect(StructuredErrorBuilder.thoughtNotFound('id').code).toBe('THOUGHT_NOT_FOUND');
      expect(StructuredErrorBuilder.circularReference([]).code).toBe('CIRCULAR_REFERENCE');
      expect(StructuredErrorBuilder.contradictionDetected('test').code).toBe('CONTRADICTION_DETECTED');
      expect(StructuredErrorBuilder.configurationError('set', 'err').code).toBe('CONFIGURATION_ERROR');
      expect(StructuredErrorBuilder.evaluationFailed('test').code).toBe('EVALUATION_FAILED');
      expect(StructuredErrorBuilder.semanticAnalysisError('op', 'err').code).toBe('SEMANTIC_ANALYSIS_ERROR');
      expect(StructuredErrorBuilder.internalError().code).toBe('INTERNAL_ERROR');
      expect(StructuredErrorBuilder.importFailed('test').code).toBe('IMPORT_FAILED');
      expect(StructuredErrorBuilder.exportFailed('test').code).toBe('EXPORT_FAILED');
      expect(StructuredErrorBuilder.commandNotFound('cmd').code).toBe('COMMAND_NOT_FOUND');
    });
  });
});
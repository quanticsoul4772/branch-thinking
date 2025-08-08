/**
 * BranchGraphValidator - Centralized validation logic for branch-thinking
 * 
 * This class provides comprehensive validation for all input data and operations
 * within the BranchGraph system. It encapsulates validation rules to improve
 * maintainability and provide clear error messages for debugging.
 */

import {
  BranchingThoughtInput,
  CrossRefType,
  BranchNode,
  BranchState
} from './types.js';
import { 
  ValidationError, 
  BranchNotFoundError,
  ConfigurationError 
} from './utils/customErrors.js';
import { getConfig } from './config.js';

export interface ValidatedThoughtInput extends BranchingThoughtInput {
  content: string;
  type: string;
  confidence: number;
  keyPoints: string[];
}

/**
 * Centralized validator for all BranchGraph operations
 * 
 * This class provides static methods for validating various types of input
 * and data structures used throughout the branch-thinking system.
 */
export class BranchGraphValidator {
  // Validation constants
  private static readonly MAX_BRANCH_ID_LENGTH = 100;
  
  /**
   * Validates and normalizes a BranchingThoughtInput
   * 
   * @param input - The raw thought input to validate
   * @returns Validated and normalized thought input with defaults applied
   * @throws {ValidationError} If input validation fails
   * 
   * @example
   * ```typescript
   * const validInput = BranchGraphValidator.validateBranchingThoughtInput({
   *   content: "This is a valid thought",
   *   type: "observation"
   * });
   * ```
   */
  static validateBranchingThoughtInput(input: BranchingThoughtInput): ValidatedThoughtInput {
    if (!input || typeof input !== 'object') {
      throw new ValidationError('Input must be a valid object', 'input', input);
    }

    // Validate content
    this.validateContent(input.content);
    
    // Validate type
    this.validateType(input.type);
    
    // Validate confidence if provided
    const confidence = input.confidence !== undefined 
      ? this.validateConfidence(input.confidence)
      : getConfig().branch.defaultConfidence;
    
    // Validate key points if provided
    const keyPoints = input.keyPoints !== undefined 
      ? this.validateKeyPoints(input.keyPoints)
      : [];
    
    // Validate branch IDs if provided
    if (input.branchId !== undefined) {
      this.validateBranchId(input.branchId);
    }
    
    if (input.parentBranchId !== undefined) {
      this.validateBranchId(input.parentBranchId);
    }
    
    // Validate cross-references if provided
    if (input.crossRefs !== undefined) {
      this.validateCrossReferences(input.crossRefs);
    }

    return {
      ...input,
      content: input.content.trim(),
      type: input.type,
      confidence,
      keyPoints
    };
  }

  /**
   * Validates thought content string
   * 
   * @param content - The content string to validate
   * @returns The validated content string
   * @throws {ValidationError} If content is invalid
   * 
   * Content must be:
   * - A non-empty string
   * - Not just whitespace
   * - Within reasonable length limits
   */
  static validateContent(content: unknown): string {
    if (typeof content !== 'string') {
      throw new ValidationError(
        'Content must be a string',
        'content',
        { actualType: typeof content, value: content }
      );
    }

    if (content.length === 0) {
      throw new ValidationError(
        'Content cannot be empty',
        'content',
        content
      );
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      throw new ValidationError(
        'Content cannot be only whitespace',
        'content',
        content
      );
    }

    const config = getConfig();
    const maxLength = config?.evaluation?.maxContentLength ?? 10000;
    
    if (trimmedContent.length > maxLength) {
      throw new ValidationError(
        `Content exceeds maximum length of ${maxLength} characters`,
        'content',
        { length: trimmedContent.length, maxLength }
      );
    }

    return trimmedContent;
  }

  /**
   * Validates thought type string
   * 
   * @param type - The type string to validate
   * @returns The validated type string
   * @throws {ValidationError} If type is invalid
   * 
   * Type must be a non-empty string representing the thought category
   */
  static validateType(type: unknown): string {
    if (typeof type !== 'string') {
      throw new ValidationError(
        'Type must be a string',
        'type',
        { actualType: typeof type, value: type }
      );
    }

    if (type.trim().length === 0) {
      throw new ValidationError(
        'Type cannot be empty',
        'type',
        type
      );
    }

    return type.trim();
  }

  /**
   * Validates confidence score
   * 
   * @param confidence - The confidence score to validate
   * @returns The validated confidence score
   * @throws {ValidationError} If confidence is out of valid range
   * 
   * Confidence must be a number between 0.0 and 1.0 (inclusive)
   */
  static validateConfidence(confidence: unknown): number {
    if (typeof confidence !== 'number') {
      throw new ValidationError(
        'Confidence must be a number',
        'confidence',
        { actualType: typeof confidence, value: confidence }
      );
    }

    if (isNaN(confidence)) {
      throw new ValidationError(
        'Confidence cannot be NaN',
        'confidence',
        confidence
      );
    }

    if (confidence < 0.0 || confidence > 1.0) {
      throw new ValidationError(
        'Confidence must be between 0.0 and 1.0 (inclusive)',
        'confidence',
        { value: confidence, min: 0.0, max: 1.0 }
      );
    }

    return confidence;
  }

  /**
   * Validates key points array
   * 
   * @param keyPoints - The key points array to validate
   * @returns The validated key points array
   * @throws {ValidationError} If key points structure is invalid
   * 
   * Key points must be an array of non-empty strings
   */
  static validateKeyPoints(keyPoints: unknown): string[] {
    if (!Array.isArray(keyPoints)) {
      throw new ValidationError(
        'Key points must be an array',
        'keyPoints',
        { actualType: typeof keyPoints, value: keyPoints }
      );
    }

    const validatedPoints: string[] = [];
    
    for (let i = 0; i < keyPoints.length; i++) {
      const point = keyPoints[i] as unknown;
      
      if (typeof point !== 'string') {
        throw new ValidationError(
          `Key point at index ${i} must be a string`,
          'keyPoints',
          { index: i, actualType: typeof point, value: point }
        );
      }

      const trimmedPoint = point.trim();
      if (trimmedPoint.length === 0) {
        throw new ValidationError(
          `Key point at index ${i} cannot be empty`,
          'keyPoints',
          { index: i, value: point }
        );
      }

      validatedPoints.push(trimmedPoint);
    }

    return validatedPoints;
  }

  /**
   * Validates branch ID format
   * 
   * @param branchId - The branch ID to validate
   * @returns The validated branch ID
   * @throws {ValidationError} If branch ID format is invalid
   * 
   * Branch ID must be a non-empty string with valid characters
   */
  static validateBranchId(branchId: unknown): string {
    if (typeof branchId !== 'string') {
      throw new ValidationError(
        'Branch ID must be a string',
        'branchId',
        { actualType: typeof branchId, value: branchId }
      );
    }

    if (branchId.trim().length === 0) {
      throw new ValidationError(
        'Branch ID cannot be empty',
        'branchId',
        branchId
      );
    }

    // Check length constraint
    if (branchId.length > this.MAX_BRANCH_ID_LENGTH) {
      throw new ValidationError(
        `Branch ID exceeds maximum length of ${this.MAX_BRANCH_ID_LENGTH} characters`,
        'branchId',
        { length: branchId.length, maxLength: this.MAX_BRANCH_ID_LENGTH }
      );
    }

    // Check for valid characters (alphanumeric, hyphens, underscores)
    const validBranchIdPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validBranchIdPattern.test(branchId)) {
      throw new ValidationError(
        'Branch ID can only contain letters, numbers, hyphens, and underscores',
        'branchId',
        { value: branchId, pattern: validBranchIdPattern.source }
      );
    }

    return branchId.trim();
  }

  /**
   * Validates cross-references array
   * 
   * @param crossRefs - The cross-references array to validate
   * @returns The validated cross-references array
   * @throws {ValidationError} If cross-references structure is invalid
   * 
   * Cross-references must be an array of valid cross-reference objects
   */
  static validateCrossReferences(
    crossRefs: unknown
  ): Array<{ toBranch: string; type: CrossRefType; reason: string; strength: number }> {
    if (!Array.isArray(crossRefs)) {
      throw new ValidationError(
        'Cross-references must be an array',
        'crossRefs',
        { actualType: typeof crossRefs, value: crossRefs }
      );
    }

    const validatedRefs: Array<{
      toBranch: string;
      type: CrossRefType;
      reason: string;
      strength: number;
    }> = [];

    for (let i = 0; i < crossRefs.length; i++) {
      const ref = crossRefs[i] as {
        toBranch?: unknown;
        type?: unknown;
        reason?: unknown;
        strength?: unknown;
      };
      
      if (!ref || typeof ref !== 'object') {
        throw new ValidationError(
          `Cross-reference at index ${i} must be an object`,
          'crossRefs',
          { index: i, actualType: typeof ref, value: ref }
        );
      }

      // Validate toBranch
      if (!('toBranch' in ref)) {
        throw new ValidationError(
          `Cross-reference at index ${i} missing 'toBranch' field`,
          'crossRefs',
          { index: i, value: ref }
        );
      }
      const toBranch = this.validateBranchId(ref.toBranch);

      // Validate type
      if (!('type' in ref)) {
        throw new ValidationError(
          `Cross-reference at index ${i} missing 'type' field`,
          'crossRefs',
          { index: i, value: ref }
        );
      }
      const type = this.validateCrossRefType(ref.type);

      // Validate reason
      if (!('reason' in ref)) {
        throw new ValidationError(
          `Cross-reference at index ${i} missing 'reason' field`,
          'crossRefs',
          { index: i, value: ref }
        );
      }
      const reason = this.validateCrossRefReason(ref.reason);

      // Validate strength
      if (!('strength' in ref)) {
        throw new ValidationError(
          `Cross-reference at index ${i} missing 'strength' field`,
          'crossRefs',
          { index: i, value: ref }
        );
      }
      const strength = this.validateCrossRefStrength(ref.strength);

      validatedRefs.push({ toBranch, type, reason, strength });
    }

    return validatedRefs;
  }

  /**
   * Validates cross-reference type
   * 
   * @param type - The cross-reference type to validate
   * @returns The validated cross-reference type
   * @throws {ValidationError} If type is not a valid CrossRefType
   */
  static validateCrossRefType(type: unknown): CrossRefType {
    if (typeof type !== 'string') {
      throw new ValidationError(
        'Cross-reference type must be a string',
        'crossRefType',
        { actualType: typeof type, value: type }
      );
    }

    const validTypes: CrossRefType[] = [
      'complementary',
      'contradictory',
      'builds_upon',
      'alternative',
      'supports'
    ];

    if (!validTypes.includes(type as CrossRefType)) {
      throw new ValidationError(
        'Invalid cross-reference type',
        'crossRefType',
        { value: type, validTypes }
      );
    }

    return type as CrossRefType;
  }

  /**
   * Validates cross-reference reason string
   * 
   * @param reason - The reason string to validate
   * @returns The validated reason string
   * @throws {ValidationError} If reason is invalid
   */
  static validateCrossRefReason(reason: unknown): string {
    if (typeof reason !== 'string') {
      throw new ValidationError(
        'Cross-reference reason must be a string',
        'crossRefReason',
        { actualType: typeof reason, value: reason }
      );
    }

    if (reason.trim().length === 0) {
      throw new ValidationError(
        'Cross-reference reason cannot be empty',
        'crossRefReason',
        reason
      );
    }

    return reason.trim();
  }

  /**
   * Validates cross-reference strength score
   * 
   * @param strength - The strength score to validate
   * @returns The validated strength score
   * @throws {ValidationError} If strength is out of valid range
   */
  static validateCrossRefStrength(strength: unknown): number {
    if (typeof strength !== 'number') {
      throw new ValidationError(
        'Cross-reference strength must be a number',
        'crossRefStrength',
        { actualType: typeof strength, value: strength }
      );
    }

    if (isNaN(strength)) {
      throw new ValidationError(
        'Cross-reference strength cannot be NaN',
        'crossRefStrength',
        strength
      );
    }

    if (strength < 0.0 || strength > 1.0) {
      throw new ValidationError(
        'Cross-reference strength must be between 0.0 and 1.0 (inclusive)',
        'crossRefStrength',
        { value: strength, min: 0.0, max: 1.0 }
      );
    }

    return strength;
  }

  /**
   * Validates search parameters
   * 
   * @param pattern - RegExp pattern for searching
   * @param maxResults - Maximum number of results (optional)
   * @throws {ValidationError} If search parameters are invalid
   */
  static validateSearchPattern(pattern: unknown, maxResults?: unknown): void {
    if (!(pattern instanceof RegExp)) {
      throw new ValidationError(
        'Search pattern must be a RegExp',
        'searchPattern',
        { actualType: typeof pattern, value: pattern }
      );
    }

    if (maxResults !== undefined) {
      if (typeof maxResults !== 'number' || !Number.isInteger(maxResults)) {
        throw new ValidationError(
          'Max results must be an integer',
          'maxResults',
          { actualType: typeof maxResults, value: maxResults }
        );
      }

      if (maxResults < 0) {
        throw new ValidationError(
          'Max results cannot be negative',
          'maxResults',
          maxResults
        );
      }
    }
  }

  /**
   * Validates depth parameter for tree traversal
   * 
   * @param depth - The maximum depth value
   * @returns The validated depth value
   * @throws {ValidationError} If depth is invalid
   */
  static validateMaxDepth(depth: unknown): number {
    if (typeof depth !== 'number' || !Number.isInteger(depth)) {
      throw new ValidationError(
        'Max depth must be an integer',
        'maxDepth',
        { actualType: typeof depth, value: depth }
      );
    }

    if (depth < 0) {
      throw new ValidationError(
        'Max depth cannot be negative',
        'maxDepth',
        depth
      );
    }

    const maxAllowedDepth = getConfig().evaluation?.maxTraversalDepth || 1000;
    if (depth > maxAllowedDepth) {
      throw new ValidationError(
        `Max depth cannot exceed ${maxAllowedDepth}`,
        'maxDepth',
        { value: depth, max: maxAllowedDepth }
      );
    }

    return depth;
  }

  /**
   * Validates count parameter for limiting results
   * 
   * @param count - The count value to validate
   * @returns The validated count value
   * @throws {ValidationError} If count is invalid
   */
  static validateCount(count: unknown): number {
    if (typeof count !== 'number' || !Number.isInteger(count)) {
      throw new ValidationError(
        'Count must be an integer',
        'count',
        { actualType: typeof count, value: count }
      );
    }

    if (count < 0) {
      throw new ValidationError(
        'Count cannot be negative',
        'count',
        count
      );
    }

    const maxCount = getConfig().evaluation?.maxResultCount || 1000;
    if (count > maxCount) {
      throw new ValidationError(
        `Count cannot exceed ${maxCount}`,
        'count',
        { value: count, max: maxCount }
      );
    }

    return count;
  }

  /**
   * Validates branch state
   * 
   * @param state - The branch state to validate
   * @returns The validated branch state
   * @throws {ValidationError} If state is not a valid BranchState
   */
  static validateBranchState(state: unknown): BranchState {
    if (typeof state !== 'string') {
      throw new ValidationError(
        'Branch state must be a string',
        'branchState',
        { actualType: typeof state, value: state }
      );
    }

    const validStates: BranchState[] = ['active', 'suspended', 'completed', 'dead_end'];
    
    if (!validStates.includes(state as BranchState)) {
      throw new ValidationError(
        'Invalid branch state',
        'branchState',
        { value: state, validStates }
      );
    }

    return state as BranchState;
  }

  /**
   * Validates that a branch exists in storage
   * 
   * @param branchId - The branch ID to check
   * @param getBranchFn - Function to retrieve branch from storage
   * @throws {BranchNotFoundError} If branch does not exist
   */
  static validateBranchExists(
    branchId: string, 
    getBranchFn: (id: string) => BranchNode | undefined
  ): void {
    const branch = getBranchFn(branchId);
    if (!branch) {
      throw new BranchNotFoundError(branchId);
    }
  }

  /**
   * Validates thought ID format (content hash)
   * 
   * @param thoughtId - The thought ID to validate
   * @returns The validated thought ID
   * @throws {ValidationError} If thought ID format is invalid
   */
  static validateThoughtId(thoughtId: unknown): string {
    if (typeof thoughtId !== 'string') {
      throw new ValidationError(
        'Thought ID must be a string',
        'thoughtId',
        { actualType: typeof thoughtId, value: thoughtId }
      );
    }

    if (thoughtId.trim().length === 0) {
      throw new ValidationError(
        'Thought ID cannot be empty',
        'thoughtId',
        thoughtId
      );
    }

    // Validate hex string format for content hash
    const hashLength = getConfig().hash?.substringLength || 16;
    if (typeof hashLength !== 'number' || hashLength <= 0 || !Number.isInteger(hashLength)) {
      throw new ConfigurationError('Hash length must be a positive integer', 'hash.substringLength');
    }
    const hexPattern = new RegExp(`^[a-fA-F0-9]{${hashLength}}$`);

    if (!hexPattern.test(thoughtId)) {
      throw new ValidationError(
        `Thought ID must be a ${hashLength}-character hexadecimal string`,
        'thoughtId',
        { value: thoughtId, expectedLength: hashLength, pattern: hexPattern.source }
      );
    }

    return thoughtId;
  }

  /**
   * Validates similarity threshold value
   * 
   * @param threshold - The similarity threshold to validate
   * @returns The validated threshold value
   * @throws {ValidationError} If threshold is out of valid range
   */
  static validateSimilarityThreshold(threshold: unknown): number {
    if (typeof threshold !== 'number') {
      throw new ValidationError(
        'Similarity threshold must be a number',
        'similarityThreshold',
        { actualType: typeof threshold, value: threshold }
      );
    }

    if (isNaN(threshold)) {
      throw new ValidationError(
        'Similarity threshold cannot be NaN',
        'similarityThreshold',
        threshold
      );
    }

    if (threshold < 0.0 || threshold > 1.0) {
      throw new ValidationError(
        'Similarity threshold must be between 0.0 and 1.0 (inclusive)',
        'similarityThreshold',
        { value: threshold, min: 0.0, max: 1.0 }
      );
    }

    return threshold;
  }
}
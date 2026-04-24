/**
 * Property-based tests for tokenizer.js
 *
 * These tests run against the fallback path (no real tiktoken encoder),
 * which is the correct approach for unit/property testing without WASM.
 */

import * as fc from 'fast-check';
import { countTokens, fallbackCountTokens } from '../tokenizer.js';

// Ensure enc is null (fallback path) for all tests — js-tiktoken is not
// available in the Jest/jsdom environment, so loadEncoder() is never called.

/**
 * Property 1: Token counting is deterministic
 * Validates: Requirements 5.1
 *
 * For any string, countTokens(text) called twice must return the same value.
 */
describe('Property 1: Token counting is deterministic', () => {
  it('returns the same value on repeated calls for any string', () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const first = countTokens(text);
        const second = countTokens(text);
        expect(first).toBe(second);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 2: Fallback token count follows the word-count formula
 * Validates: Requirements 5.2
 *
 * For any string, fallbackCountTokens(text) must equal
 * Math.round(wordCount * 1.3) where wordCount is the number of
 * whitespace-separated non-empty tokens.
 */
describe('Property 2: Fallback token count follows word-count formula', () => {
  it('equals Math.round(wordCount * 1.3) for any string', () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
        const expected = Math.round(wordCount * 1.3);
        expect(fallbackCountTokens(text)).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });
});

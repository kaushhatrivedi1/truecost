/**
 * Property-based tests for classifier.js
 *
 * Covers Property 10 from the design document.
 */

import * as fc from 'fast-check';
import { classifyIntent } from '../classifier.js';

const VALID_INTENTS = ['coding', 'writing', 'research', 'exploratory', 'general'];

/**
 * Property 10: Intent classification always returns a valid intent value
 * Validates: Requirements 11.1
 *
 * For any string, classifyIntent(text) must return one of the five valid
 * intent values and never null, undefined, or any other string.
 */
describe('Property 10: Intent classification always returns a valid intent value', () => {
  it('returns one of the five valid intents for any string input', () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const result = classifyIntent(text);
        expect(VALID_INTENTS).toContain(result);
        expect(result).not.toBeNull();
        expect(result).not.toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });
});

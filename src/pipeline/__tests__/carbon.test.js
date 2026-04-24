/**
 * Property-based tests for carbon.js
 *
 * Covers Properties 4–7 from the design document.
 */

import * as fc from 'fast-check';
import {
  MODEL_ENERGY_TABLE,
  getEnergyPerToken,
  estimateCarbon,
  estimateWater,
  computeEquivalences,
} from '../carbon.js';

const KNOWN_MODEL_IDS = Object.keys(MODEL_ENERGY_TABLE);

/**
 * Property 4: Model energy lookup returns correct value for known models
 * and falls back to default for unknown models.
 * Validates: Requirements 6.3
 */
describe('Property 4: Model energy lookup', () => {
  it('returns the exact table value for any known model ID', () => {
    fc.assert(
      fc.property(fc.constantFrom(...KNOWN_MODEL_IDS), (modelId) => {
        expect(getEnergyPerToken(modelId)).toBe(MODEL_ENERGY_TABLE[modelId]);
      }),
      { numRuns: 100 }
    );
  });

  it('returns the default value for any unknown model ID', () => {
    // Filter out special JavaScript object property names (e.g. __proto__, valueOf,
    // toString, constructor) that may exist on plain objects and cause false positives.
    const SPECIAL_OBJECT_PROPS = new Set(
      Object.getOwnPropertyNames(Object.prototype)
    );
    fc.assert(
      fc.property(
        fc.string().filter(
          (s) => !KNOWN_MODEL_IDS.includes(s) && !SPECIAL_OBJECT_PROPS.has(s)
        ),
        (modelId) => {
          expect(getEnergyPerToken(modelId)).toBe(MODEL_ENERGY_TABLE['default']);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 5: Carbon estimation formula is exact.
 * Validates: Requirements 7.1, 7.2
 */
describe('Property 5: Carbon estimation formula is exact', () => {
  it('computes mg equal to ((tokens/1000) * whPer1000 / 1000) * 475 * 1_000_000', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        fc.constantFrom(...KNOWN_MODEL_IDS),
        (tokens, modelId) => {
          const whPer1000 = MODEL_ENERGY_TABLE[modelId];
          const expected = ((tokens / 1000) * whPer1000 / 1000) * 475 * 1_000_000;
          const result = estimateCarbon(tokens, modelId);
          expect(result.mg).toBe(expected);
          expect(result.isEstimate).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 6: Water estimation formula is exact.
 * Validates: Requirements 8.1
 */
describe('Property 6: Water estimation formula is exact', () => {
  it('computes ml equal to tokens * 0.0106', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100000 }), (tokens) => {
        const result = estimateWater(tokens);
        expect(result.ml).toBe(tokens * 0.0106);
        expect(result.isEstimate).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 7: Equivalence conversions are exact.
 * Validates: Requirements 9.1, 9.2, 9.3
 */
describe('Property 7: Equivalence conversions are exact', () => {
  it('satisfies all three equivalence formulas simultaneously', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1000000 }),
        fc.integer({ min: 0, max: 100000 }),
        (carbonMg, tokens) => {
          const result = computeEquivalences(carbonMg, tokens);
          expect(result.phoneChargeSeconds).toBe(carbonMg * 2.1);
          expect(result.googleSearches).toBe(carbonMg / 200);
          expect(result.wordsEquivalent).toBe(tokens * 0.75);
        }
      ),
      { numRuns: 100 }
    );
  });
});

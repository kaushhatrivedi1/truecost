/**
 * Property-based tests for scorer.js
 *
 * Covers Properties 8–9 from the design document.
 */

import * as fc from 'fast-check';
import { gradeFromScore, scoreEfficiency } from '../scorer.js';

describe('scoreEfficiency — conversational filler penalties', () => {
  it('penalises obvious filler-heavy prompts', () => {
    const text = 'Good morning I wanted to know what is the time, I mean what is the time rn, like currently';
    const { score, grade } = scoreEfficiency(text, text.split(/\s+/).length);
    expect(score).toBeLessThan(90);
    expect(grade).not.toBe('A');
  });
});

/**
 * Property 8: Efficiency score is always in the range [0, 100]
 * Validates: Requirements 10.1
 *
 * For any string and token count (integer 0–10000),
 * scoreEfficiency(text, tokens).score must be in [0, 100].
 */
describe('Property 8: Efficiency score is always in [0, 100]', () => {
  it('score is never below 0 or above 100 for any input', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.integer({ min: 0, max: 10000 }),
        (text, tokens) => {
          const { score } = scoreEfficiency(text, tokens);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 9: Grade boundaries are correct for all scores
 * Validates: Requirements 10.2
 *
 * For any integer score in [0, 100], gradeFromScore(score) must return
 * the correct grade letter and colour for all 5 grade/colour pairs.
 */
describe('Property 9: Grade boundaries are correct for all scores', () => {
  it('returns A/green for scores 90–100', () => {
    fc.assert(
      fc.property(fc.integer({ min: 90, max: 100 }), (score) => {
        const { grade, gradeColor } = gradeFromScore(score);
        expect(grade).toBe('A');
        expect(gradeColor).toBe('green');
      }),
      { numRuns: 100 }
    );
  });

  it('returns B/teal for scores 80–89', () => {
    fc.assert(
      fc.property(fc.integer({ min: 80, max: 89 }), (score) => {
        const { grade, gradeColor } = gradeFromScore(score);
        expect(grade).toBe('B');
        expect(gradeColor).toBe('teal');
      }),
      { numRuns: 100 }
    );
  });

  it('returns C/amber for scores 70–79', () => {
    fc.assert(
      fc.property(fc.integer({ min: 70, max: 79 }), (score) => {
        const { grade, gradeColor } = gradeFromScore(score);
        expect(grade).toBe('C');
        expect(gradeColor).toBe('amber');
      }),
      { numRuns: 100 }
    );
  });

  it('returns D/orange for scores 60–69', () => {
    fc.assert(
      fc.property(fc.integer({ min: 60, max: 69 }), (score) => {
        const { grade, gradeColor } = gradeFromScore(score);
        expect(grade).toBe('D');
        expect(gradeColor).toBe('orange');
      }),
      { numRuns: 100 }
    );
  });

  it('returns F/red for scores 0–59', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 59 }), (score) => {
        const { grade, gradeColor } = gradeFromScore(score);
        expect(grade).toBe('F');
        expect(gradeColor).toBe('red');
      }),
      { numRuns: 100 }
    );
  });

  it('covers all 5 grade/colour pairs across the full [0, 100] range', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (score) => {
        const { grade, gradeColor } = gradeFromScore(score);

        if (score >= 90) {
          expect(grade).toBe('A');
          expect(gradeColor).toBe('green');
        } else if (score >= 80) {
          expect(grade).toBe('B');
          expect(gradeColor).toBe('teal');
        } else if (score >= 70) {
          expect(grade).toBe('C');
          expect(gradeColor).toBe('amber');
        } else if (score >= 60) {
          expect(grade).toBe('D');
          expect(gradeColor).toBe('orange');
        } else {
          expect(grade).toBe('F');
          expect(gradeColor).toBe('red');
        }
      }),
      { numRuns: 100 }
    );
  });
});

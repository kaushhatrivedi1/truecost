/**
 * Tests for local-rewriter.js
 *
 * Covers Requirements 14.1, 14.2, 20.1, 20.2
 */

import { localRewrite, FILLER_REMOVALS, VERBOSE_REPLACEMENTS } from '../local-rewriter.js';

// ---------------------------------------------------------------------------
// Unit tests — specific examples
// ---------------------------------------------------------------------------

describe('localRewrite — filler removal', () => {
  it('removes "please " from the start of a prompt', () => {
    const { rewritten } = localRewrite('Please summarise this document.');
    expect(rewritten).toBe('summarise this document.');
  });

  it('removes "can you " from a prompt', () => {
    const { rewritten } = localRewrite('Can you explain how this works?');
    expect(rewritten).toBe('explain how this works?');
  });

  it('removes "could you " from a prompt', () => {
    const { rewritten } = localRewrite('Could you write a function for me?');
    expect(rewritten).toBe('write a function for me?');
  });

  it('removes "kindly " from a prompt', () => {
    const { rewritten } = localRewrite('Kindly provide a summary.');
    expect(rewritten).toBe('provide a summary.');
  });

  it('removes "i want you to " from a prompt', () => {
    const { rewritten } = localRewrite('I want you to write a poem.');
    expect(rewritten).toBe('write a poem.');
  });

  it('removes "i need you to " from a prompt', () => {
    const { rewritten } = localRewrite('I need you to fix this bug.');
    expect(rewritten).toBe('fix this bug.');
  });

  it('removes "i would like you to " from a prompt', () => {
    const { rewritten } = localRewrite('I would like you to review this code.');
    expect(rewritten).toBe('review this code.');
  });

  it('removes "would you mind " from a prompt', () => {
    const { rewritten } = localRewrite('Would you mind explaining this?');
    expect(rewritten).toBe('explaining this?');
  });
});

describe('localRewrite — verbose replacements', () => {
  it('replaces "in order to" with "to"', () => {
    const { rewritten } = localRewrite('Use this in order to improve performance.');
    expect(rewritten).toBe('Use this to improve performance.');
  });

  it('replaces "due to the fact that" with "because"', () => {
    const { rewritten } = localRewrite('It failed due to the fact that the input was null.');
    expect(rewritten).toBe('It failed because the input was null.');
  });

  it('replaces "at this point in time" with "now"', () => {
    const { rewritten } = localRewrite('At this point in time, we should refactor.');
    expect(rewritten).toBe('now, we should refactor.');
  });

  it('replaces "prior to" with "before"', () => {
    const { rewritten } = localRewrite('Prior to deployment, run the tests.');
    expect(rewritten).toBe('before deployment, run the tests.');
  });

  it('replaces "subsequent to" with "after"', () => {
    const { rewritten } = localRewrite('Subsequent to the review, apply the changes.');
    expect(rewritten).toBe('after the review, apply the changes.');
  });

  it('replaces "a large number of" with "many"', () => {
    const { rewritten } = localRewrite('There are a large number of issues.');
    expect(rewritten).toBe('There are many issues.');
  });

  it('replaces "a small number of" with "few"', () => {
    const { rewritten } = localRewrite('Only a small number of tests failed.');
    expect(rewritten).toBe('Only few tests failed.');
  });

  it('removes "it is important to note that"', () => {
    const { rewritten } = localRewrite('It is important to note that this is experimental.');
    expect(rewritten).toBe('this is experimental.');
  });

  it('removes "it should be noted that"', () => {
    const { rewritten } = localRewrite('It should be noted that the API is deprecated.');
    expect(rewritten).toBe('the API is deprecated.');
  });

  it('removes "please " filler (FILLER_REMOVALS runs before verbose replacements)', () => {
    // "please " is stripped globally by FILLER_REMOVALS, so "please note that" verbose
    // pattern never fires — the result is "note that ..." rather than the full phrase removed
    const { rewritten } = localRewrite('Please note that this feature is in beta.');
    expect(rewritten).toBe('note that this feature is in beta.');
  });
});

describe('localRewrite — whitespace collapsing', () => {
  it('collapses multiple spaces left by removals', () => {
    const { rewritten } = localRewrite('Please  summarise this.');
    expect(rewritten).not.toMatch(/\s{2,}/);
  });

  it('trims leading and trailing whitespace', () => {
    const { rewritten } = localRewrite('Please summarise this.');
    expect(rewritten).toBe(rewritten.trim());
  });
});

describe('localRewrite — changes tracking', () => {
  it('returns an empty changes array when no rules match', () => {
    const { changes } = localRewrite('Summarise this document in three bullet points.');
    expect(changes).toEqual([]);
  });

  it('returns at most 3 changes even when more rules match', () => {
    // Craft a prompt that triggers many rules
    const text =
      'Please can you in order to due to the fact that prior to subsequent to a large number of';
    const { changes } = localRewrite(text);
    expect(changes.length).toBeLessThanOrEqual(3);
  });

  it('records a change description for each matched rule', () => {
    const { changes } = localRewrite('Use this in order to improve performance.');
    expect(changes.length).toBeGreaterThan(0);
    expect(changes[0]).toContain('in order to');
  });
});

describe('localRewrite — return shape', () => {
  it('always returns source: "Local"', () => {
    expect(localRewrite('Hello world').source).toBe('Local');
    expect(localRewrite('Please help me.').source).toBe('Local');
  });

  it('returns original text unchanged when no rules match', () => {
    const text = 'Summarise this document in three bullet points.';
    const { rewritten } = localRewrite(text);
    expect(rewritten).toBe(text);
  });

  it('returns the correct shape: { rewritten, changes, source }', () => {
    const result = localRewrite('Hello world');
    expect(result).toHaveProperty('rewritten');
    expect(result).toHaveProperty('changes');
    expect(result).toHaveProperty('source');
    expect(Array.isArray(result.changes)).toBe(true);
  });
});

describe('localRewrite — combined filler + verbose', () => {
  it('applies both filler removal and verbose replacement in sequence', () => {
    const { rewritten } = localRewrite('Please use this in order to improve performance.');
    // "Please " removed, "in order to" → "to"
    expect(rewritten).toBe('use this to improve performance.');
  });
});

// ---------------------------------------------------------------------------
// Exported constants sanity checks
// ---------------------------------------------------------------------------

describe('FILLER_REMOVALS', () => {
  it('is an array of RegExp objects', () => {
    expect(Array.isArray(FILLER_REMOVALS)).toBe(true);
    FILLER_REMOVALS.forEach((r) => expect(r).toBeInstanceOf(RegExp));
  });

  it('contains 8 patterns', () => {
    expect(FILLER_REMOVALS).toHaveLength(8);
  });
});

describe('VERBOSE_REPLACEMENTS', () => {
  it('is an array of [RegExp, string] pairs', () => {
    expect(Array.isArray(VERBOSE_REPLACEMENTS)).toBe(true);
    VERBOSE_REPLACEMENTS.forEach(([pattern, replacement]) => {
      expect(pattern).toBeInstanceOf(RegExp);
      expect(typeof replacement).toBe('string');
    });
  });

  it('contains 20 pairs', () => {
    expect(VERBOSE_REPLACEMENTS).toHaveLength(20);
  });
});

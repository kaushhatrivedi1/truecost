/**
 * Tests for rewriter.js (orchestrator) and gemini-rewriter.js
 *
 * Covers Requirements 13.1, 13.3, 13.4, 14.1, 20.3
 */

const { rewrite } = require('../rewriter.js');

// ---------------------------------------------------------------------------
// Helper — build a valid Gemini API response body
// ---------------------------------------------------------------------------

function makeGeminiResponse(rewritten, changes) {
  return {
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({ rewritten, changes }),
            },
          ],
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 1. Gemini timeout triggers local fallback
// ---------------------------------------------------------------------------

describe('rewrite — Gemini timeout triggers local fallback', () => {
  afterEach(() => {
    global.fetch = undefined;
  });

  it('falls back to local rewriter when fetch never resolves within 3000ms', async () => {
    // Mock fetch to return a promise that rejects when the AbortSignal fires.
    // We simulate the abort by rejecting with a DOMException (AbortError) after
    // a short real delay — this mirrors what the browser does when AbortController
    // aborts an in-flight fetch.
    global.fetch = jest.fn((_url, options) => {
      return new Promise((_resolve, reject) => {
        // Listen for the abort signal and reject immediately when it fires
        options.signal.addEventListener('abort', () => {
          const err = new DOMException('The operation was aborted.', 'AbortError');
          reject(err);
        });
      });
    });

    // Use real timers but a very short timeout by monkey-patching setTimeout
    // so the AbortController fires almost immediately in the test.
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = (fn, _delay, ...args) => originalSetTimeout(fn, 10, ...args);

    try {
      const result = await rewrite('Explain quantum computing in detail.', 'fake-api-key');
      expect(result.source).toBe('Local');
      expect(result).toHaveProperty('original');
      expect(result).toHaveProperty('rewritten');
      expect(result).toHaveProperty('tokenDelta');
      expect(result).toHaveProperty('percentSaved');
    } finally {
      global.setTimeout = originalSetTimeout;
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Gemini non-2xx response triggers local fallback
// ---------------------------------------------------------------------------

describe('rewrite — Gemini non-2xx response triggers local fallback', () => {
  afterEach(() => {
    global.fetch = undefined;
  });

  it('falls back to local rewriter when Gemini returns HTTP 500', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      })
    );

    const result = await rewrite('Write a function to sort an array.', 'fake-api-key');

    expect(result.source).toBe('Local');
  });

  it('falls back to local rewriter when Gemini returns HTTP 429', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 429,
      })
    );

    const result = await rewrite('Summarise this article.', 'fake-api-key');

    expect(result.source).toBe('Local');
  });
});

// ---------------------------------------------------------------------------
// 3. Gemini malformed JSON triggers local fallback
// ---------------------------------------------------------------------------

describe('rewrite — Gemini malformed JSON triggers local fallback', () => {
  afterEach(() => {
    global.fetch = undefined;
  });

  it('falls back to local rewriter when candidates text is not valid JSON', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: 'This is not JSON at all!',
                    },
                  ],
                },
              },
            ],
          }),
      })
    );

    const result = await rewrite('Debug this code snippet.', 'fake-api-key');

    expect(result.source).toBe('Local');
  });

  it('falls back to local rewriter when candidates array is missing', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ error: 'unexpected shape' }),
      })
    );

    const result = await rewrite('Explain recursion.', 'fake-api-key');

    expect(result.source).toBe('Local');
  });
});

// ---------------------------------------------------------------------------
// 4. No-API-key path calls local rewriter directly (fetch never called)
// ---------------------------------------------------------------------------

describe('rewrite — no API key calls local rewriter directly', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = undefined;
  });

  it('does not call fetch when apiKey is an empty string', async () => {
    const result = await rewrite('Please explain how neural networks work.', '');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.source).toBe('Local');
  });

  it('does not call fetch when apiKey is null', async () => {
    const result = await rewrite('Please explain how neural networks work.', null);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.source).toBe('Local');
  });

  it('does not call fetch when apiKey is undefined', async () => {
    const result = await rewrite('Please explain how neural networks work.', undefined);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.source).toBe('Local');
  });
});

// ---------------------------------------------------------------------------
// 5. Successful Gemini response returns correct shape
// ---------------------------------------------------------------------------

describe('rewrite — successful Gemini response returns correct shape', () => {
  afterEach(() => {
    global.fetch = undefined;
  });

  it('returns source: "Gemini" and all required fields on a valid response', async () => {
    const rewrittenText = 'Explain quantum computing.';
    const changes = ['Removed filler phrase', 'Simplified wording'];

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(makeGeminiResponse(rewrittenText, changes)),
      })
    );

    const originalText = 'Can you please explain quantum computing in detail?';
    const result = await rewrite(originalText, 'valid-api-key');

    expect(result.source).toBe('Gemini');
    expect(result.original).toBe(originalText);
    expect(result.rewritten).toBe(rewrittenText);
    expect(result.changes).toEqual(changes);
    expect(typeof result.tokenDelta).toBe('number');
    expect(typeof result.percentSaved).toBe('number');
    expect(result.percentSaved).toBeGreaterThanOrEqual(0);
  });

  it('computes tokenDelta as rewrittenTokens - originalTokens', async () => {
    // Original: "Can you please explain quantum computing in detail?" — longer
    // Rewritten: "Explain quantum computing." — shorter
    const originalText = 'Can you please explain quantum computing in detail?';
    const rewrittenText = 'Explain quantum computing.';

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(makeGeminiResponse(rewrittenText, [])),
      })
    );

    const result = await rewrite(originalText, 'valid-api-key');

    // Rewritten is shorter, so tokenDelta should be negative
    expect(result.tokenDelta).toBeLessThan(0);
    expect(result.percentSaved).toBeGreaterThan(0);
  });

  it('returns percentSaved of 0 when original text is empty', async () => {
    const rewrittenText = '';

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(makeGeminiResponse(rewrittenText, [])),
      })
    );

    const result = await rewrite('', 'valid-api-key');

    expect(result.percentSaved).toBe(0);
  });
});

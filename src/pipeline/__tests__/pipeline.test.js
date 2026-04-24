/**
 * Property-based tests for pipeline.js
 *
 * Covers Properties 3 and 18 from the design document.
 *
 * Note: js-tiktoken (WASM) is not available in the Jest/jsdom environment.
 * The tokenizer's fallback path (word-count formula) is used throughout.
 * The tiktoken encoder module is mocked to prevent load errors.
 */

import * as fc from 'fast-check';

// Mock js-tiktoken so the import in tokenizer.js does not throw in Jest
jest.mock('js-tiktoken', () => ({
  get_encoding: () => {
    throw new Error('WASM not available in test environment');
  },
}));

// Import after mocking so the mock is in place when the module is evaluated
const { analyse } = require('../pipeline.js');

/**
 * Property 3: Result object always carries the "est." token label
 * Validates: Requirements 5.3
 *
 * For any string passed through analyse(), the returned result must have
 * tokenLabel === "est.".
 */
describe('Property 3: Result object always carries the "est." token label', () => {
  it('tokenLabel is always "est." for any prompt string', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (text) => {
        const result = await analyse(text);
        expect(result.tokenLabel).toBe('est.');
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 18: Analysis pipeline makes no network calls without a Gemini API key
 * Validates: Requirements 20.1, 20.3
 *
 * For any prompt string, running analyse() without a configured API key must
 * complete without calling fetch or XMLHttpRequest.
 */
describe('Property 18: Analysis pipeline makes no network calls without a Gemini API key', () => {
  let originalFetch;
  let originalXHR;
  let fetchCallCount;
  let xhrCallCount;

  beforeEach(() => {
    fetchCallCount = 0;
    xhrCallCount = 0;

    // Save originals
    originalFetch = global.fetch;
    originalXHR = global.XMLHttpRequest;

    // Replace with tracking mocks
    global.fetch = jest.fn(() => {
      fetchCallCount++;
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    global.XMLHttpRequest = jest.fn(() => {
      xhrCallCount++;
      return {
        open: jest.fn(),
        send: jest.fn(),
        setRequestHeader: jest.fn(),
      };
    });
  });

  afterEach(() => {
    // Restore originals
    global.fetch = originalFetch;
    global.XMLHttpRequest = originalXHR;
  });

  it('never calls fetch or XMLHttpRequest for any prompt string', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (text) => {
        fetchCallCount = 0;
        xhrCallCount = 0;

        await analyse(text);

        expect(fetchCallCount).toBe(0);
        expect(xhrCallCount).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});

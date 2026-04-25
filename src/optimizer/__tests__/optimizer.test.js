/**
 * Tests for optimizer.js — shared Gemini analysis + rewrite path
 */

const { optimizePrompt } = require('../optimizer.js');

function makeGeminiOptimizeResponse(payload) {
  return {
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify(payload),
            },
          ],
        },
      },
    ],
  };
}

describe('optimizePrompt', () => {
  afterEach(() => {
    global.fetch = undefined;
  });

  it('uses Gemini for both analysis and rewrite when the API call succeeds', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(makeGeminiOptimizeResponse({
          score: 63,
          intent: 'general',
          suggestion: 'Ask the question directly.',
          rewritten: 'What time is it right now?',
          changes: ['Removed filler'],
        })),
      })
    );

    const result = await optimizePrompt(
      'Good morning I wanted to know what is the time right now',
      'default',
      'valid-api-key'
    );

    expect(result.analysisSource).toBe('Gemini');
    expect(result.score).toBe(63);
    expect(result.suggestion).toBe('Ask the question directly.');
    expect(result.rewrite.source).toBe('Gemini');
    expect(result.rewrite.rewritten).toBe('What time is it right now?');
  });

  it('falls back to local analysis and rewrite when Gemini fails', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      })
    );

    const result = await optimizePrompt(
      'Please explain how neural networks work.',
      'default',
      'valid-api-key'
    );

    expect(result.analysisSource).toBe('Local');
    expect(result.rewrite.source).toBe('Local');
    expect(result.geminiError).toContain('500');
  });
});

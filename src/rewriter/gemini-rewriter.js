// gemini-rewriter.js — Gemini API rewrite path with 3s timeout

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Rewrite a prompt using the Gemini API.
 *
 * @param {string} originalText - The original prompt text.
 * @param {string} apiKey - The Gemini API key.
 * @returns {Promise<{ rewritten: string, changes: string[], source: 'Gemini' }>}
 * @throws {Error} On timeout, non-2xx response, or malformed JSON response.
 */
async function geminiRewrite(originalText, apiKey) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  let response;
  try {
    response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a prompt optimization assistant. Rewrite the following prompt to be more concise and clear. Return ONLY a JSON object with this exact shape: {"rewritten": "...", "changes": ["change1", "change2"]}. No markdown, no explanation.\n\nPrompt: ${originalText}`,
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    // AbortError or network error — triggers fallback
    throw new Error(`Gemini API request failed: ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Gemini API returned non-2xx status: ${response.status}`);
  }

  const data = await response.json();

  let parsed;
  try {
    const rawText = data.candidates[0].content.parts[0].text;
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new Error(`Gemini API returned malformed JSON: ${err.message}`);
  }

  return {
    rewritten: parsed.rewritten,
    changes: parsed.changes,
    source: 'Gemini',
  };
}

export { geminiRewrite };

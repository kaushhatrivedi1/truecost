// gemini-optimizer.js — Gemini API path for prompt analysis + rewrite

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const OPTIMIZE_INSTRUCTION = [
  'Analyze and rewrite this user prompt.',
  'Keep the same intent.',
  'Score prompt efficiency from 0 to 100.',
  'Provide one short suggestion.',
  'Rewrite the prompt to be shorter and clearer.',
  'Do not add new requirements or examples.',
  'Return this exact JSON shape:',
  '{"score": 0, "intent": "", "suggestion": "", "rewritten": "", "changes": [""]}',
  'Return JSON only.',
].join(' ');

async function geminiOptimize(originalText, apiKey) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  let response;
  try {
    response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: OPTIMIZE_INSTRUCTION }],
        },
        contents: [
          {
            parts: [
              {
                text: originalText,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 220,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    throw new Error(`Gemini API request failed: ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Gemini API returned non-2xx status: ${response.status}${errorText ? ` - ${errorText}` : ''}`);
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
    score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
    intent: parsed.intent || 'general',
    suggestion: parsed.suggestion || '',
    rewritten: parsed.rewritten || originalText,
    changes: Array.isArray(parsed.changes) ? parsed.changes : [],
    source: 'Gemini',
  };
}

export { geminiOptimize };

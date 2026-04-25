// gemini-optimizer.js — Gemini API path for prompt analysis + rewrite

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const OPTIMIZE_INSTRUCTION = `You are a prompt efficiency expert. Analyze the user's prompt for these specific problems:
- Repetition: the same idea restated multiple times in different words
- Redundancy: sentences that add no new information
- Vagueness: unclear or non-specific instructions
- Verbosity: unnecessary filler words, preamble, or padding
- Missing specifics: no output format, tone, or constraints stated when they would help

Score the prompt efficiency from 0 to 100 using these rules:
- Start at 100
- Deduct 5-15 per unique problem found (repetition, redundancy, verbosity, vagueness each count separately)
- A highly repetitive prompt with little new information per sentence should score below 50
- A clear, specific, non-redundant prompt with a stated goal scores 85+

Write a suggestion that:
- Names the SPECIFIC problem in this prompt (e.g. "This prompt repeats the same instruction 8 times")
- Gives ONE concrete fix (e.g. "State the requirement once, clearly")
- Is 1-2 sentences max, direct and actionable

Rewrite the prompt to be as short as possible while preserving the full intent. Remove all repeated ideas, keep only the clearest version of each instruction.

Return this exact JSON only, no markdown:
{"score": 0, "intent": "", "suggestion": "", "rewritten": "", "changes": [""]}`;


async function geminiOptimize(originalText, apiKey) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

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
          temperature: 0.2,
          maxOutputTokens: 600,
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

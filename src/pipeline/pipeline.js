// pipeline.js — Analysis pipeline orchestrator

import { countTokens } from './tokenizer.js';
import { estimateCarbon, estimateWater, computeEquivalences } from './carbon.js';
import { scoreEfficiency, FILLER_OPENERS, VAGUE_WORDS, FORMAT_KEYWORDS, REDUNDANT_MARKERS } from './scorer.js';
import { classifyIntent } from './classifier.js';

/**
 * Derives a human-readable suggestion string from the prompt text and token count,
 * based on the same deduction rules used by the efficiency scorer.
 *
 * Returns the most impactful improvement hint, or a generic tip if no issues found.
 *
 * @param {string} text
 * @param {number} tokens
 * @returns {string}
 */
function deriveSuggestion(text, tokens) {
  const lower = text.toLowerCase();

  // Filler openers: -5 per match, max -25 (highest potential impact)
  const hasFillerOpener = FILLER_OPENERS.some(
    (f) => lower.startsWith(f) || lower.includes('. ' + f)
  );
  if (hasFillerOpener) {
    return 'Remove filler openers (e.g. "Can you", "Please") to improve clarity and reduce token usage.';
  }

  // Redundant context markers (only penalised if prompt > 100 tokens): -10
  if (tokens > 100) {
    const hasRedundant = REDUNDANT_MARKERS.some((m) => lower.includes(m));
    if (hasRedundant) {
      return 'Remove redundant context markers (e.g. "as I mentioned", "to reiterate") to tighten your prompt.';
    }
  }

  // Token length penalties
  if (tokens > 500) {
    return 'Your prompt is very long — consider breaking it into smaller, focused requests.';
  }
  if (tokens > 300) {
    return 'Your prompt is quite long — try condensing it to reduce token usage.';
  }

  // No output format specified: -5
  const hasFormat = FORMAT_KEYWORDS.some((k) => lower.includes(k));
  if (!hasFormat) {
    return 'Add an output format specification (e.g. "as a list", "in JSON", "step by step") to get more structured responses.';
  }

  // Vague words: -3 per match, max -15
  const hasVague = VAGUE_WORDS.some((v) => lower.includes(v));
  if (hasVague) {
    return 'Reduce vague language (e.g. "stuff", "things", "somehow") to make your prompt more precise.';
  }

  return 'Your prompt looks efficient! Keep prompts specific and concise for best results.';
}

/**
 * Runs the full analysis pipeline on a prompt string.
 *
 * @param {string} promptText  The prompt to analyse
 * @param {string} [modelId]   The model ID (falls back to "default" if not provided)
 * @returns {Promise<Object>}  The full ResultObject
 */
async function analyse(promptText, modelId) {
  const resolvedModelId = modelId || 'default';

  const tokens = countTokens(promptText);
  const carbon = estimateCarbon(tokens, resolvedModelId);
  const water = estimateWater(tokens);
  const equivalences = computeEquivalences(carbon.mg, tokens);
  const { score, grade, gradeColor } = scoreEfficiency(promptText, tokens);
  const intent = classifyIntent(promptText);
  const suggestion = deriveSuggestion(promptText, tokens);

  return {
    tokens,
    tokenLabel: 'est.',
    carbon,
    water,
    equivalences,
    score,
    grade,
    gradeColor,
    intent,
    modelId: resolvedModelId,
    suggestion,
  };
}

export { analyse, deriveSuggestion };

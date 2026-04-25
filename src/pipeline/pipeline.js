// pipeline.js — Analysis pipeline orchestrator

import { countTokens } from './tokenizer.js';
import { estimateCarbon, estimateWater, computeEquivalences } from './carbon.js';
import { scoreEfficiency, repetitionPenalty, FILLER_OPENERS, VAGUE_WORDS, FORMAT_KEYWORDS, REDUNDANT_MARKERS } from './scorer.js';
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

  // Repetition: highest priority — catches the biggest waste
  const repPenalty = repetitionPenalty(text);
  if (repPenalty >= 20) {
    return 'This prompt is highly repetitive — the same idea is restated many times. State each requirement once, clearly.';
  }
  if (repPenalty >= 10) {
    return 'This prompt repeats several ideas unnecessarily. Trim redundant sentences to cut token usage.';
  }

  // Filler openers
  const hasFillerOpener = FILLER_OPENERS.some(
    (f) => lower.startsWith(f) || lower.includes('. ' + f)
  );
  if (hasFillerOpener) {
    return 'Remove filler openers like "Can you" or "Please" — start directly with the task.';
  }

  // Redundant context markers
  if (tokens > 100) {
    const hasRedundant = REDUNDANT_MARKERS.some((m) => lower.includes(m));
    if (hasRedundant) {
      return 'Remove phrases like "as I mentioned" or "to reiterate" — they add length without adding meaning.';
    }
  }

  // Token length
  if (tokens > 500) {
    return 'This prompt is very long — consider splitting it into smaller, focused requests.';
  }
  if (tokens > 300) {
    return 'This prompt is quite long — try condensing it to reduce token usage.';
  }

  // Vague words
  const hasVague = VAGUE_WORDS.some((v) => lower.includes(v));
  if (hasVague) {
    return 'Replace vague words like "stuff", "things", or "somehow" with specific terms.';
  }

  return '';
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

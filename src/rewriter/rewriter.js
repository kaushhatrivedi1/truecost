// rewriter.js — Rewriter orchestrator (Gemini API vs local fallback)

const { geminiRewrite } = require('./gemini-rewriter.js');
const { localRewrite } = require('./local-rewriter.js');
const { fallbackCountTokens } = require('../pipeline/tokenizer.js');

/**
 * Rewrite a prompt using the Gemini API if an API key is provided,
 * falling back to the local rule-based rewriter on any error.
 *
 * @param {string} originalText - The original prompt text.
 * @param {string|null|undefined} apiKey - The Gemini API key (optional).
 * @returns {Promise<import('./types').RewriteResult>}
 */
async function rewrite(originalText, apiKey) {
  let result;

  if (apiKey) {
    try {
      result = await geminiRewrite(originalText, apiKey);
    } catch {
      result = localRewrite(originalText);
    }
  } else {
    result = localRewrite(originalText);
  }

  const originalTokens = fallbackCountTokens(originalText);
  const rewrittenTokens = fallbackCountTokens(result.rewritten);
  const tokenDelta = rewrittenTokens - originalTokens;
  const percentSaved =
    originalTokens > 0 ? Math.abs(tokenDelta / originalTokens) * 100 : 0;

  return {
    original: originalText,
    rewritten: result.rewritten,
    tokenDelta,
    percentSaved,
    changes: result.changes,
    source: result.source,
  };
}

module.exports = { rewrite };

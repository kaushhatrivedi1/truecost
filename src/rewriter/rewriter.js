// rewriter.js — Rewriter orchestrator (Gemini API vs local fallback)

import { geminiRewrite } from './gemini-rewriter.js';
import { localRewrite } from './local-rewriter.js';
import { fallbackCountTokens } from '../pipeline/tokenizer.js';

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

export { rewrite };

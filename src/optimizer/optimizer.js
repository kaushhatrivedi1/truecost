// optimizer.js — Shared prompt analysis + rewrite orchestrator

import { analyse } from '../pipeline/pipeline.js';
import { gradeFromScore } from '../pipeline/scorer.js';
import { fallbackCountTokens } from '../pipeline/tokenizer.js';
import { rewrite } from '../rewriter/rewriter.js';
import { geminiOptimize } from './gemini-optimizer.js';

function buildRewriteResult(originalText, rewritten, changes, source) {
  const originalTokens = fallbackCountTokens(originalText);
  const rewrittenTokens = fallbackCountTokens(rewritten);
  const tokenDelta = rewrittenTokens - originalTokens;
  const percentSaved =
    originalTokens > 0 ? Math.abs(tokenDelta / originalTokens) * 100 : 0;

  return {
    original: originalText,
    rewritten,
    tokenDelta,
    percentSaved,
    changes,
    source,
  };
}

function summariseGeminiError(message) {
  if (!message) return null;

  const lower = message.toLowerCase();
  if (lower.includes('status: 429') || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return 'Gemini quota is currently unavailable for this key, so Trace used local fallback.';
  }

  if (lower.includes('status: 400')) {
    return 'Gemini could not accept this request, so Trace used local fallback.';
  }

  if (lower.includes('status: 401') || lower.includes('status: 403')) {
    return 'Gemini access was denied for this key, so Trace used local fallback.';
  }

  if (lower.includes('abort') || lower.includes('timeout')) {
    return 'Gemini timed out, so Trace used local fallback.';
  }

  return 'Gemini is temporarily unavailable, so Trace used local fallback.';
}

async function optimizePrompt(originalText, modelId, apiKey) {
  const localAnalysis = await analyse(originalText, modelId);
  let geminiError = null;

  if (apiKey) {
    try {
      const geminiResult = await geminiOptimize(originalText, apiKey);
      return {
        ...localAnalysis,
        score: geminiResult.score,
        ...gradeFromScore(geminiResult.score),
        intent: geminiResult.intent || localAnalysis.intent,
        suggestion: geminiResult.suggestion || localAnalysis.suggestion,
        analysisSource: 'Gemini',
        geminiError: null,
        rewrite: buildRewriteResult(
          originalText,
          geminiResult.rewritten,
          geminiResult.changes,
          geminiResult.source
        ),
      };
    } catch (err) {
      geminiError = summariseGeminiError(err.message);
      console.warn('[Trace] Gemini optimize failed, falling back to local analysis.', err);
    }
  }

  return {
    ...localAnalysis,
    analysisSource: 'Local',
    geminiError,
    rewrite: await rewrite(originalText, ''),
  };
}

export { optimizePrompt };

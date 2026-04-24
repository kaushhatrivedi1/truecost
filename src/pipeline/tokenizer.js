// tokenizer.js — js-tiktoken wrapper with word-count fallback

import { get_encoding } from 'js-tiktoken';

let enc = null;

/**
 * Loads the cl100k_base encoder from js-tiktoken.
 * Sets the module-level `enc` variable on success, or null on failure.
 */
export async function loadEncoder() {
  try {
    enc = get_encoding('cl100k_base');
  } catch (e) {
    enc = null;
  }
}

/**
 * Counts tokens in the given text.
 * Uses the tiktoken encoder when available, otherwise falls back to the
 * word-count formula: Math.round(wordCount * 1.3).
 *
 * @param {string} text
 * @returns {number}
 */
export function countTokens(text) {
  if (enc) {
    return enc.encode(text).length;
  }
  return fallbackCountTokens(text);
}

/**
 * Fallback token counter using the word-count formula.
 * Always uses Math.round(wordCount * 1.3) regardless of encoder availability.
 * Exported for testing purposes.
 *
 * @param {string} text
 * @returns {number}
 */
export function fallbackCountTokens(text) {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(wordCount * 1.3);
}

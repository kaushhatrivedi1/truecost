// local-rewriter.js — Rule-based local rewrite path

const FILLER_REMOVALS = [
  /\bplease\s+/gi,
  /\bkindly\s+/gi,
  /\bcan you\s+/gi,
  /\bcould you\s+/gi,
  /\bi want you to\s+/gi,
  /\bi need you to\s+/gi,
  /\bi would like you to\s+/gi,
  /\bwould you mind\s+/gi,
];

const VERBOSE_REPLACEMENTS = [
  [/\bin order to\b/gi, 'to'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bat this point in time\b/gi, 'now'],
  [/\bfor the purpose of\b/gi, 'to'],
  [/\bin the event that\b/gi, 'if'],
  [/\bwith regard to\b/gi, 'about'],
  [/\bwith respect to\b/gi, 'about'],
  [/\bprior to\b/gi, 'before'],
  [/\bsubsequent to\b/gi, 'after'],
  [/\bin spite of the fact that\b/gi, 'although'],
  [/\bnotwithstanding the fact that\b/gi, 'although'],
  [/\bit is important to note that\b/gi, ''],
  [/\bit should be noted that\b/gi, ''],
  [/\bplease note that\b/gi, ''],
  [/\bas a matter of fact\b/gi, 'in fact'],
  [/\bthe fact that\b/gi, 'that'],
  [/\ba large number of\b/gi, 'many'],
  [/\ba small number of\b/gi, 'few'],
  [/\bin close proximity to\b/gi, 'near'],
  [/\bat the present time\b/gi, 'now'],
];

/**
 * Apply rule-based local rewriting to the given text.
 * @param {string} text - The original prompt text.
 * @returns {{ rewritten: string, changes: string[], source: 'Local' }}
 */
function localRewrite(text) {
  let result = text;
  const changes = [];

  // Apply filler removals
  for (const pattern of FILLER_REMOVALS) {
    const before = result;
    result = result.replace(pattern, '');
    if (result !== before) {
      changes.push(`Removed filler phrase matching "${pattern.source}"`);
    }
  }

  // Apply verbose replacements
  for (const [pattern, replacement] of VERBOSE_REPLACEMENTS) {
    const before = result;
    result = result.replace(pattern, replacement);
    if (result !== before) {
      // Build a human-readable description using the source string
      const readable = pattern.source
        .replace(/\\b/g, '')
        .replace(/\\s\+/g, ' ')
        .trim();
      changes.push(`Replaced "${readable}" → "${replacement}"`);
    }
  }

  // Collapse multiple whitespace and trim
  result = result.replace(/\s{2,}/g, ' ').trim();

  return {
    rewritten: result,
    changes: changes.slice(0, 3),
    source: 'Local',
  };
}

module.exports = { FILLER_REMOVALS, VERBOSE_REPLACEMENTS, localRewrite };

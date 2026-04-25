// local-rewriter.js — Rule-based local rewrite path

const FILLER_REMOVALS = [
  /^good\s+(morning|afternoon|evening|night)[,!.]?\s*/i,
  /^(?:hey|hi|hello)(?:,\s*there)?[,.]?\s*/i,
  /\bplease\s+/gi,
  /\bkindly\s+/gi,
  /\bcan you\s+/gi,
  /\bcould you\s+/gi,
  /\bi wanted to (know|ask|understand|find out)\s+/gi,
  /\bi want you to\s+/gi,
  /\bi need you to\s+/gi,
  /\bi would like you to\s+/gi,
  /\bwould you mind\s+/gi,
  /\bi was wondering if you (could|would)\s+/gi,
  /\bif you don'?t mind[,.]?\s*/gi,
  /\bplease help me\s+/gi,
  /\bi just wanted to (ask|know|understand)\s+/gi,
  /\bi mean[,.]?\s*/gi,
  /\bthanks? (in advance|so much|a lot)[.!]?\s*$/gi,
  /\bthank you[.!]?\s*$/gi,
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
  [/\bit is important to note that\b/gi, ''],
  [/\bit should be noted that\b/gi, ''],
  [/\bplease note that\b/gi, ''],
  [/\bthe fact that\b/gi, 'that'],
  [/\ba large number of\b/gi, 'many'],
  [/\ba small number of\b/gi, 'few'],
  [/\bthe majority of\b/gi, 'most'],
  [/\bis able to\b/gi, 'can'],
  [/\bin close proximity to\b/gi, 'near'],
  [/\bat the present time\b/gi, 'now'],
  [/\bbasically\b/gi, ''],
  [/\bactually\b/gi, ''],
  [/\bliterally\b/gi, ''],
  [/\bjust\b/gi, ''],
  [/\brn\b/gi, 'now'],
  [/\blike currently\b/gi, 'now'],
  [/\bcurrently\b/gi, 'now'],
  [/\bkind of\b/gi, ''],
  [/\bsort of\b/gi, ''],
];

function localRewrite(text) {
  let result = text;
  const changes = [];

  for (const pattern of FILLER_REMOVALS) {
    const before = result;
    result = result.replace(pattern, '');
    if (result !== before) changes.push(`Removed filler: "${pattern.source.substring(0, 30)}"`);
  }

  for (const [pattern, replacement] of VERBOSE_REPLACEMENTS) {
    const before = result;
    result = result.replace(pattern, replacement);
    if (result !== before) {
      const readable = pattern.source.replace(/\\b/g, '').replace(/\\s\+/g, ' ').trim();
      if (replacement) changes.push(`"${readable}" → "${replacement}"`);
      else changes.push(`Removed "${readable}"`);
    }
  }

  result = result.replace(/\s{2,}/g, ' ').trim();
  result = result.replace(/\s+([,.?!])/g, '$1');
  result = result.replace(/,\s*,+/g, ', ');
  result = result.replace(/\b((?:\w+\s+){2,6}\w+)\b,\s*\1\b/gi, '$1');
  result = result.replace(/\bnow\s+now\b/gi, 'now');
  result = result.replace(/\bnow\s+now(?=[?.!]|$)/gi, 'now');
  result = result.replace(/\b(\w+)\s+\1(?=[?.!]|$)/gi, '$1');
  result = result.replace(/\s+(\w+),\s*\1$/i, ' $1');
  result = result.replace(/,\s*now$/i, ' now');
  if (result && !/[.?!]$/.test(result)) result += '?';
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  const originalWords = text.trim().split(/\s+/).filter(Boolean).length;
  const rewrittenWords = result.trim().split(/\s+/).filter(Boolean).length;
  const reductionPercent = originalWords > 0
    ? Math.round(((originalWords - rewrittenWords) / originalWords) * 100)
    : 0;

  return {
    rewritten: result,
    changes: changes.slice(0, 3),
    source: 'Local',
    reductionPercent,
    originalWords,
    rewrittenWords,
  };
}

export { FILLER_REMOVALS, VERBOSE_REPLACEMENTS, localRewrite };

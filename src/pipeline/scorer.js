// scorer.js — Efficiency scorer and grade calculator

const FILLER_OPENERS = [
  'can you', 'could you', 'please', 'i want you to', 'i need you to',
  'i would like you to', 'kindly', 'would you mind',
  'good morning', 'good afternoon', 'good evening',
  'i wanted to know', 'i mean'
];

const VAGUE_WORDS = [
  'stuff', 'things', 'something', 'somehow', 'whatever', 'etc',
  'various', 'some kind of', 'a bit', 'sort of', 'kind of',
  'rn', 'currently'
];

const FORMAT_KEYWORDS = [
  'list', 'table', 'json', 'markdown', 'bullet', 'numbered',
  'paragraph', 'summary', 'code', 'step by step', 'format'
];

const REDUNDANT_MARKERS = [
  'as i mentioned', 'as stated above', 'as previously', 'like i said',
  'to reiterate', 'as noted'
];

/**
 * Returns { grade, gradeColor } for a given numeric score.
 * @param {number} score - A score in [0, 100]
 * @returns {{ grade: string, gradeColor: string }}
 */
function gradeFromScore(score) {
  if (score >= 90) return { grade: 'A', gradeColor: 'green' };
  if (score >= 80) return { grade: 'B', gradeColor: 'teal' };
  if (score >= 70) return { grade: 'C', gradeColor: 'amber' };
  if (score >= 60) return { grade: 'D', gradeColor: 'orange' };
  return { grade: 'F', gradeColor: 'red' };
}

/**
 * Scores the efficiency of a prompt and returns a grade.
 * @param {string} text - The prompt text
 * @param {number} tokens - The token count for the prompt
 * @returns {{ score: number, grade: string, gradeColor: string }}
 */
function scoreEfficiency(text, tokens) {
  let score = 100;
  const lower = text.toLowerCase();

  // Filler openers: -5 per match, max -25
  const fillerCount = FILLER_OPENERS.filter(
    (f) => lower.startsWith(f) || lower.includes('. ' + f) || lower.includes(', ' + f) || lower.includes(' ' + f)
  ).length;
  score -= Math.min(fillerCount * 5, 25);

  // Vague words: -3 per match, max -15
  const vagueCount = VAGUE_WORDS.filter((v) => lower.includes(v)).length;
  score -= Math.min(vagueCount * 3, 15);

  // Token length penalties
  if (tokens > 500) score -= 10;
  else if (tokens > 300) score -= 5;

  // No output format specified: -5
  const hasFormat = FORMAT_KEYWORDS.some((k) => lower.includes(k));
  if (!hasFormat) score -= 5;

  // Redundant context markers (only penalised if prompt > 100 tokens): -10
  if (tokens > 100) {
    const hasRedundant = REDUNDANT_MARKERS.some((m) => lower.includes(m));
    if (hasRedundant) score -= 10;
  }

  score = Math.max(0, score);
  return { score, ...gradeFromScore(score) };
}

export {
  FILLER_OPENERS,
  VAGUE_WORDS,
  FORMAT_KEYWORDS,
  REDUNDANT_MARKERS,
  gradeFromScore,
  scoreEfficiency,
};

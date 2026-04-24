// classifier.js — Intent classifier

const INTENT_KEYWORDS = {
  coding:      ['code', 'function', 'debug', 'implement', 'class', 'api', 'script', 'bug', 'error', 'syntax', 'algorithm', 'refactor'],
  writing:     ['write', 'draft', 'essay', 'email', 'letter', 'blog', 'article', 'paragraph', 'tone', 'grammar', 'proofread'],
  research:    ['explain', 'what is', 'how does', 'research', 'compare', 'difference', 'overview', 'history', 'define', 'summarise'],
  exploratory: ['brainstorm', 'ideas', 'suggest', 'options', 'possibilities', 'what if', 'explore', 'creative', 'imagine'],
};

function classifyIntent(text) {
  const lower = text.toLowerCase();
  const scores = Object.entries(INTENT_KEYWORDS).map(([intent, keywords]) => ({
    intent,
    score: keywords.filter(k => lower.includes(k)).length,
  }));
  const best = scores.sort((a, b) => b.score - a.score)[0];
  return best.score > 0 ? best.intent : 'general';
}

export { INTENT_KEYWORDS, classifyIntent };

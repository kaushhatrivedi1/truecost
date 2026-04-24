# Design Document — Trace AI Layer

## Overview

Trace AI Layer is a two-part system that measures and reduces the environmental cost of AI prompt usage. It consists of:

1. **Chrome Extension (Manifest V3)** — a content-script-based extension that intercepts prompts on major AI chat platforms, runs a fully client-side analysis pipeline, renders an overlay badge with environmental metrics, and optionally rewrites prompts for efficiency.
2. **Next.js Dashboard** — a local web application (`localhost:3000`) that visualises personal usage analytics and a team leaderboard, sourced from an exported JSON file or built-in seed data.

The system is designed to operate entirely offline. The only optional network call is to the Gemini API when the user has configured an API key and explicitly clicks "Optimise prompt".

### Key Design Principles

- **Adapter pattern for DOM isolation**: All platform-specific DOM interaction is encapsulated in per-platform adapter modules. The core analysis pipeline receives plain text and never touches the DOM.
- **Client-side only**: All computation (token counting, carbon/water estimation, scoring, classification) runs in the content script context with no mandatory external calls.
- **Progressive enhancement**: The extension degrades gracefully — if a platform adapter cannot locate the textarea, it logs a warning and exits cleanly. If js-tiktoken fails, a word-count fallback is used. If the Gemini API times out, the local rewriter takes over.
- **Privacy by design**: No prompt text or usage data leaves the browser except via the optional Gemini API call, which is user-initiated.

---

## Architecture

### High-Level Flow

```
User types in AI chat platform
        │
        ▼
Content Script (content.js)
  ├── Detects platform from URL
  ├── Loads platform Adapter
  └── Adapter attaches input listener (800ms debounce)
        │
        ▼
Analysis Pipeline (pipeline.js)
  ├── Token counting (js-tiktoken / fallback)
  ├── Model detection (from Adapter)
  ├── Carbon estimation
  ├── Water estimation
  ├── Equivalence conversions
  ├── Efficiency scoring
  └── Intent classification
        │
        ▼
Overlay Renderer (overlay.js)
  ├── Injects badge below textarea
  ├── Displays metrics + grade + suggestions
  ├── "Optimise prompt" → Rewriter
  └── "Dismiss" → saves Session to chrome.storage.local
        │
        ▼
Storage (chrome.storage.local)
  ├── sessions[] (max 500)
  ├── totals {}
  ├── per_platform {}
  └── settings {}
```

### Extension File Structure

```
extension/
├── manifest.json               # MV3 manifest
├── src/
│   ├── content.js              # Entry point: platform detection, adapter loading
│   ├── background.js           # Service worker: message routing, storage helpers
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js            # 3-tab popup controller
│   │   └── popup.css
│   ├── adapters/
│   │   ├── chatgpt.js
│   │   ├── claude.js
│   │   ├── gemini.js
│   │   ├── perplexity.js
│   │   ├── mistral.js
│   │   └── copilot.js
│   ├── pipeline/
│   │   ├── pipeline.js         # Orchestrates all analysis steps
│   │   ├── tokenizer.js        # js-tiktoken wrapper + fallback
│   │   ├── carbon.js           # Carbon & water estimation
│   │   ├── scorer.js           # Efficiency scoring & grading
│   │   └── classifier.js       # Intent classification
│   ├── rewriter/
│   │   ├── rewriter.js         # Orchestrates Gemini API vs local path
│   │   ├── gemini-rewriter.js  # Gemini API call with 3s timeout
│   │   └── local-rewriter.js   # Rule-based local rewrite
│   └── overlay/
│       ├── overlay.js          # Badge injection & rendering
│       └── overlay.css
└── dist/                       # Built output (gitignored)

trace-dashboard/
├── package.json
├── next.config.js
├── app/
│   ├── layout.tsx
│   ├── page.tsx                # Personal analytics (/)
│   └── team/
│       └── page.tsx            # Team leaderboard (/team)
├── components/
│   ├── StatCard.tsx
│   ├── Co2LineChart.tsx
│   ├── GradeBarChart.tsx
│   ├── IntentDonutChart.tsx
│   ├── PlatformDonutChart.tsx
│   ├── SessionTable.tsx
│   ├── TeamLeaderboard.tsx
│   ├── TeamBarChart.tsx
│   └── InsightCard.tsx
├── lib/
│   ├── seed-data.ts            # Hardcoded seed data
│   └── data-utils.ts           # Data transformation helpers
└── public/

Makefile
README.md
```

### Manifest V3 Configuration

The `manifest.json` declares:
- `"manifest_version": 3`
- `content_scripts` with `matches` for all 6 supported platforms
- `permissions`: `["storage", "activeTab"]`
- `host_permissions` for `https://generativelanguage.googleapis.com/*` (Gemini API)
- `action` pointing to `popup/popup.html`
- `background.service_worker` pointing to `background.js`
- `web_accessible_resources` for adapter scripts and overlay CSS

### SPA Navigation Handling

All adapters use a `MutationObserver` on `document.body` to detect URL changes (comparing `location.href` before and after each mutation batch). When a navigation is detected, the adapter calls its own `teardown()` then `init()` methods. A guard flag prevents double-initialisation. The re-init must complete within 2 seconds of the navigation event.

---

## Components and Interfaces

### Platform Adapters

Each adapter exports a standard interface:

```js
// Adapter interface (all adapters implement this shape)
{
  init(): void,           // Attach listeners, find textarea
  teardown(): void,       // Remove listeners, clean up
  getText(): string,      // Extract current prompt text
  setText(text: string): void  // Inject text into textarea
}
```

**ChatGPT Adapter** (`chatgpt.js`)
- Selector fallbacks: `#prompt-textarea`, `[data-id="root"] textarea`, `form textarea`
- `setText`: sets `element.value`, dispatches `new Event('input', {bubbles:true})` and `new Event('change', {bubbles:true})` — React requires synthetic events to register value changes
- SPA detection: `MutationObserver` on `document.body`, watches `childList` and `subtree`

**Claude Adapter** (`claude.js`)
- Selector fallbacks: `.ProseMirror`, `[contenteditable="true"]`, `div[data-placeholder]`
- `getText`: reads `element.innerText` (ProseMirror is a contenteditable div, not a textarea)
- `setText`: uses `document.execCommand('selectAll')` then `document.execCommand('insertText', false, text)` to trigger ProseMirror's internal change detection

**Gemini Adapter** (`gemini.js`)
- Shadow DOM traversal: recursive `queryShadowRoot(root, selector)` helper that walks `shadowRoot` properties
- Selector fallbacks: `rich-textarea textarea`, `[data-test-id="input-area"] textarea`
- `setText`: sets `element.value`, dispatches `input` and `change` events

**Perplexity / Mistral Adapters**
- Standard textarea selectors with multiple fallbacks
- Same `setText` pattern as ChatGPT (React-compatible events)

**Copilot Adapter**
- Searches within `document.querySelector('iframe')?.contentDocument` first, then falls back to main document
- Same textarea selector fallbacks

### Analysis Pipeline

`pipeline.js` is the single entry point for all analysis. It accepts a plain string and returns a `ResultObject`.

```js
// pipeline.js
async function analyse(promptText, modelId) {
  const tokens = await countTokens(promptText);
  const carbon = estimateCarbon(tokens, modelId);
  const water = estimateWater(tokens);
  const equivalences = computeEquivalences(carbon, tokens);
  const { score, grade, gradeColor } = scoreEfficiency(promptText, tokens);
  const intent = classifyIntent(promptText);
  return { tokens, carbon, water, equivalences, score, grade, gradeColor, intent, modelId };
}
```

**ResultObject schema:**
```js
{
  tokens: number,           // token count (js-tiktoken or fallback)
  tokenLabel: "est.",       // always "est."
  carbon: {
    mg: number,             // milligrams CO₂e
    isEstimate: true
  },
  water: {
    ml: number,             // millilitres
    isEstimate: true
  },
  equivalences: {
    phoneChargeSeconds: number,
    googleSearches: number,
    wordsEquivalent: number
  },
  score: number,            // 0–100
  grade: "A"|"B"|"C"|"D"|"F",
  gradeColor: "green"|"teal"|"amber"|"orange"|"red",
  intent: "coding"|"writing"|"research"|"exploratory"|"general",
  modelId: string,
  suggestion: string        // human-readable improvement hint
}
```

### Tokenizer (`tokenizer.js`)

```js
import { get_encoding } from 'js-tiktoken';

let enc = null;

async function loadEncoder() {
  try {
    enc = get_encoding('cl100k_base');
  } catch (e) {
    enc = null;
  }
}

function countTokens(text) {
  if (enc) {
    return enc.encode(text).length;
  }
  // Fallback: word_count × 1.3
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(words * 1.3);
}
```

js-tiktoken is bundled via the build step (webpack/esbuild) so it is available offline. The WASM binary is included in the extension bundle.

### Carbon & Water Estimator (`carbon.js`)

```js
const MODEL_ENERGY_TABLE = {
  'gpt-4':           0.0029,
  'gpt-4o':          0.0021,
  'gpt-4o-mini':     0.0012,
  'gpt-3.5-turbo':   0.0017,
  'claude-3-opus':   0.0031,
  'claude-3-sonnet': 0.0022,
  'claude-3-haiku':  0.0009,
  'claude-3-5-sonnet': 0.0020,
  'gemini-1.5-pro':  0.0026,
  'gemini-1.5-flash': 0.0011,
  'gemini-2.0':      0.0018,
  'mistral-large':   0.0024,
  'mistral-small':   0.0013,
  'default':         0.0021,
};
const GRID_INTENSITY_G_PER_KWH = 475;   // IEA World Energy Outlook 2023
const WATER_ML_PER_TOKEN = 0.0106;       // Li et al. 2023, arXiv:2304.03271

function estimateCarbon(tokens, modelId) {
  const whPer1000 = MODEL_ENERGY_TABLE[modelId] ?? MODEL_ENERGY_TABLE['default'];
  const energyWh = (tokens / 1000) * whPer1000;
  const carbonMg = (energyWh / 1000) * GRID_INTENSITY_G_PER_KWH * 1_000_000;
  return { mg: carbonMg, isEstimate: true };
}

function estimateWater(tokens) {
  return { ml: tokens * WATER_ML_PER_TOKEN, isEstimate: true };
}

function computeEquivalences(carbonMg, tokens) {
  return {
    phoneChargeSeconds: carbonMg * 2.1,
    googleSearches: carbonMg / 200,
    wordsEquivalent: tokens * 0.75,
  };
}
```

### Efficiency Scorer (`scorer.js`)

```js
const FILLER_OPENERS = [
  'can you', 'could you', 'please', 'i want you to', 'i need you to',
  'i would like you to', 'kindly', 'would you mind'
];
const VAGUE_WORDS = [
  'stuff', 'things', 'something', 'somehow', 'whatever', 'etc',
  'various', 'some kind of', 'a bit', 'sort of', 'kind of'
];
const FORMAT_KEYWORDS = [
  'list', 'table', 'json', 'markdown', 'bullet', 'numbered',
  'paragraph', 'summary', 'code', 'step by step', 'format'
];
const REDUNDANT_MARKERS = [
  'as i mentioned', 'as stated above', 'as previously', 'like i said',
  'to reiterate', 'as noted'
];

function scoreEfficiency(text, tokens) {
  let score = 100;
  const lower = text.toLowerCase();

  // Filler openers: -5 per match, max -25
  const fillerCount = FILLER_OPENERS.filter(f => lower.startsWith(f) || lower.includes('. ' + f)).length;
  score -= Math.min(fillerCount * 5, 25);

  // Vague words: -3 per match, max -15
  const vagueCount = VAGUE_WORDS.filter(v => lower.includes(v)).length;
  score -= Math.min(vagueCount * 3, 15);

  // Token length penalties
  if (tokens > 500) score -= 10;
  else if (tokens > 300) score -= 5;

  // No output format specified: -5
  const hasFormat = FORMAT_KEYWORDS.some(k => lower.includes(k));
  if (!hasFormat) score -= 5;

  // Redundant context markers (only penalised if prompt > 100 tokens): -10
  if (tokens > 100) {
    const hasRedundant = REDUNDANT_MARKERS.some(m => lower.includes(m));
    if (hasRedundant) score -= 10;
  }

  score = Math.max(0, score);
  return { score, ...gradeFromScore(score) };
}

function gradeFromScore(score) {
  if (score >= 90) return { grade: 'A', gradeColor: 'green' };
  if (score >= 80) return { grade: 'B', gradeColor: 'teal' };
  if (score >= 70) return { grade: 'C', gradeColor: 'amber' };
  if (score >= 60) return { grade: 'D', gradeColor: 'orange' };
  return { grade: 'F', gradeColor: 'red' };
}
```

### Intent Classifier (`classifier.js`)

```js
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
```

### Rewriter

**`rewriter.js`** — orchestrator:
```js
async function rewrite(originalText, apiKey) {
  if (apiKey) {
    try {
      return await geminiRewrite(originalText, apiKey);
    } catch {
      return localRewrite(originalText);
    }
  }
  return localRewrite(originalText);
}
```

**`gemini-rewriter.js`** — Gemini API path:
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}`
- Method: `POST`, `Content-Type: application/json`
- Body: `{ contents: [{ parts: [{ text: SYSTEM_PROMPT + originalText }] }] }`
- System prompt instructs the model to return a JSON object: `{ rewritten: string, changes: string[] }`
- Timeout: `AbortController` with 3000ms signal; on abort or non-2xx response, throws to trigger fallback

**`local-rewriter.js`** — rule-based path:
```js
const FILLER_REMOVALS = [/* regex patterns for filler phrases */];
const VERBOSE_REPLACEMENTS = [
  [/\bin order to\b/gi, 'to'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bat this point in time\b/gi, 'now'],
  // ... more replacements
];

function localRewrite(text) {
  let result = text;
  const changes = [];
  for (const [pattern, replacement] of VERBOSE_REPLACEMENTS) {
    if (pattern.test(result)) {
      result = result.replace(pattern, replacement);
      changes.push(`Replaced "${pattern.source}" → "${replacement}"`);
    }
  }
  result = result.replace(/\s{2,}/g, ' ').trim();
  return { rewritten: result, changes: changes.slice(0, 3), source: 'Local' };
}
```

### Overlay Renderer (`overlay.js`)

The overlay is a `<div id="trace-overlay">` injected as a sibling immediately after the textarea's parent container. It uses inline positioning (`position: relative` on the wrapper) so it flows with the document rather than being viewport-fixed.

Overlay lifecycle:
1. `renderOverlay(result, adapter)` — creates/updates the badge DOM
2. User clicks "Optimise prompt" → calls `rewriter.rewrite()`, shows loading spinner, then calls `renderRewriteResult()`
3. User clicks "Apply" → calls `adapter.setText(rewritten)`, changes button to "Undo"
4. User clicks "Undo" → calls `adapter.setText(original)`
5. User clicks "Dismiss" → hides overlay, calls `saveSession(result)`

### Extension Popup (`popup.js`)

Three-tab controller reading from `chrome.storage.local`:
- **Tab 1 (Session Summary)**: reads `totals` and `sessions` to compute grade distribution
- **Tab 2 (Last Prompt)**: reads `sessions[sessions.length - 1]`
- **Tab 3 (Settings)**: reads/writes `settings`; "Export JSON" uses `chrome.downloads.download()` with a Blob URL; "Clear data" calls `chrome.storage.local.clear()`

### Storage Module

All storage operations go through a thin wrapper that enforces the 500-entry cap:

```js
async function saveSession(session) {
  const data = await chrome.storage.local.get(['sessions', 'totals', 'per_platform']);
  let sessions = data.sessions ?? [];
  if (sessions.length >= 500) sessions.shift(); // remove oldest
  sessions.push(session);
  // update totals
  const totals = updateTotals(data.totals ?? {}, session);
  // update per_platform
  const perPlatform = updatePerPlatform(data.per_platform ?? {}, session);
  await chrome.storage.local.set({ sessions, totals, per_platform: perPlatform });
}
```

### Next.js Dashboard

Built with Next.js 14 App Router, TypeScript, Tailwind CSS, and Recharts.

**`app/page.tsx`** (personal analytics):
- Reads data from React state: either uploaded JSON or `SEED_DATA`
- File upload via `<input type="file" accept=".json">` with `FileReader` API
- Passes data to chart components as props

**`app/team/page.tsx`** (team leaderboard):
- Always uses `TEAM_SEED_DATA` (hardcoded, no upload)
- Renders leaderboard table sorted by chosen metric (default: total tokens)

**Chart components** (all use Recharts with `'use client'` directive):
- `Co2LineChart` — `LineChart` showing last 30 sessions' carbon values
- `GradeBarChart` — `BarChart` showing A/B/C/D/F counts
- `IntentDonutChart` — `PieChart` with `innerRadius` showing intent breakdown
- `PlatformDonutChart` — `PieChart` with `innerRadius` showing platform breakdown
- `TeamBarChart` — `BarChart` showing tokens per team member

**`SessionTable`** — client component with local state for sort column/direction and current page (10 rows per page).

---

## Data Models

### Session Entry

```ts
interface Session {
  id: string;                    // crypto.randomUUID()
  timestamp: string;             // ISO 8601
  platform_id: string;           // e.g. "chatgpt"
  model_id: string;              // e.g. "gpt-4o"
  tokens: number;
  carbon_mg: number;
  water_ml: number;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  intent: 'coding' | 'writing' | 'research' | 'exploratory' | 'general';
  prompt_preview: string;        // first 200 chars of original prompt
}
```

### Storage Root

```ts
interface StorageRoot {
  sessions: Session[];           // max 500 entries, FIFO eviction
  totals: {
    tokens: number;
    carbon_mg: number;
    water_ml: number;
    session_count: number;
  };
  per_platform: {
    [platform_id: string]: {
      tokens: number;
      carbon_mg: number;
      water_ml: number;
      session_count: number;
    };
  };
  settings: {
    overlay_enabled: boolean;    // default: true
    rewriter_enabled: boolean;   // default: true
    show_equivalences: boolean;  // default: true
    gemini_api_key: string;      // default: ""
    dashboard_url: string;       // default: "http://localhost:3000"
  };
}
```

### Rewrite Result

```ts
interface RewriteResult {
  original: string;
  rewritten: string;
  tokenDelta: number;            // rewritten_tokens - original_tokens (negative = savings)
  percentSaved: number;          // Math.abs(tokenDelta / original_tokens) * 100
  changes: string[];             // max 3 labelled change descriptions
  source: 'Gemini' | 'Local';
}
```

### Dashboard Seed Data

```ts
// Personal analytics seed (used when no JSON uploaded)
const PERSONAL_SEED_DATA: Session[] = [/* 30 representative sessions */];

// Team seed data (always used on /team page)
const TEAM_SEED_DATA: TeamMember[] = [
  { name: 'Alex Chen',    prompts: 340, avgGrade: 'B', tokens: 89000, topIntent: 'coding',      intentPct: 70 },
  { name: 'Priya Sharma', prompts: 210, avgGrade: 'C', tokens: 67000, topIntent: 'research',    intentPct: 60 },
  { name: 'Marcus Webb',  prompts: 180, avgGrade: 'D', tokens: 71000, topIntent: 'exploratory', intentPct: 80 },
  { name: 'Sofia Reyes',  prompts: 290, avgGrade: 'A', tokens: 54000, topIntent: 'writing',     intentPct: 65 },
  { name: 'James Park',   prompts: 155, avgGrade: 'B', tokens: 48000, topIntent: 'coding',      intentPct: 55 },
];
```

### JSON Export Format

The exported JSON file from the popup matches the `StorageRoot` shape exactly, so the dashboard can consume it directly without transformation.

---

## Correctness Properties


*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Token counting is deterministic

*For any* prompt string, calling `countTokens(text)` twice in succession must return the same value. The tokenizer must be a pure, side-effect-free function of its input.

**Validates: Requirements 5.1**

---

### Property 2: Fallback token count follows the word-count formula

*For any* prompt string, when the js-tiktoken encoder is unavailable, the fallback token count must equal `Math.round(wordCount * 1.3)` where `wordCount` is the number of whitespace-separated non-empty tokens in the string.

**Validates: Requirements 5.2**

---

### Property 3: Result object always carries the "est." token label

*For any* prompt string passed through the analysis pipeline, the returned result object must have `tokenLabel === "est."`.

**Validates: Requirements 5.3**

---

### Property 4: Model energy lookup returns correct value for all known models and falls back to default for unknown models

*For any* model ID string that exists in the energy table, `getEnergyPerToken(modelId)` must return the exact value from the table. *For any* model ID string that does not exist in the table, `getEnergyPerToken(modelId)` must return the value for `"default"`.

**Validates: Requirements 6.3**

---

### Property 5: Carbon estimation formula is exact

*For any* token count and model ID, the computed `carbon_mg` must equal `((tokens / 1000) * MODEL_ENERGY_TABLE[modelId] / 1000) * 475 * 1_000_000`. No rounding or approximation is permitted in the formula itself.

**Validates: Requirements 7.1, 7.2**

---

### Property 6: Water estimation formula is exact

*For any* token count, the computed `water_ml` must equal `tokens * 0.0106`.

**Validates: Requirements 8.1**

---

### Property 7: Equivalence conversions are exact

*For any* `carbon_mg` value and token count, the computed equivalences must satisfy all three formulas simultaneously: `phoneChargeSeconds === carbon_mg * 2.1`, `googleSearches === carbon_mg / 200`, and `wordsEquivalent === tokens * 0.75`.

**Validates: Requirements 9.1, 9.2, 9.3**

---

### Property 8: Efficiency score is always in the range [0, 100]

*For any* prompt string and token count, the computed efficiency score must be a number in the closed interval [0, 100]. Deductions must never push the score below 0.

**Validates: Requirements 10.1**

---

### Property 9: Grade boundaries are correct for all scores

*For any* integer score in [0, 100], `gradeFromScore(score)` must return: `A` for scores 90–100, `B` for 80–89, `C` for 70–79, `D` for 60–69, and `F` for scores below 60. The grade colour must match the corresponding colour code.

**Validates: Requirements 10.2**

---

### Property 10: Intent classification always returns a valid intent value

*For any* prompt string, `classifyIntent(text)` must return one of the five valid values: `"coding"`, `"writing"`, `"research"`, `"exploratory"`, or `"general"`. It must never return `null`, `undefined`, or any other string.

**Validates: Requirements 11.1**

---

### Property 11: Overlay renders all required fields for any valid result object

*For any* valid `ResultObject`, the HTML produced by `renderOverlay(result)` must contain: the platform label, the grade letter, the efficiency score, the token count with "est." suffix, the carbon value with disclaimer, the water value with disclaimer, all three equivalence values (when `show_equivalences` is enabled), the suggestion string, an "Optimise prompt" button, and a "Dismiss" button.

**Validates: Requirements 12.2, 24.1**

---

### Property 12: Rewrite result display contains all required fields for any valid RewriteResult

*For any* valid `RewriteResult` object (from either the Gemini or local path), the rendered rewrite UI must contain: the original prompt text, the rewritten prompt text, the token delta, the percentage of tokens saved, up to 3 labelled changes, and the source label (`"Gemini"` or `"Local"`).

**Validates: Requirements 13.5, 14.2**

---

### Property 13: Apply-then-undo is a round trip

*For any* original prompt string, after the rewriter applies a rewrite (replacing the textarea content) and the user then clicks "Undo", the textarea content must equal the original prompt string exactly.

**Validates: Requirements 15.3**

---

### Property 14: Session storage preserves all required fields

*For any* valid `ResultObject`, the session entry written to `chrome.storage.local` must contain all required fields: `timestamp`, `platform_id`, `model_id`, `tokens`, `carbon_mg`, `water_ml`, `score`, `grade`, `intent`, and `prompt_preview`. Each field must match the corresponding value in the result object.

**Validates: Requirements 16.1**

---

### Property 15: Sessions array never exceeds 500 entries

*For any* sequence of session saves of length N (where N > 500), the `sessions` array in `chrome.storage.local` must have length exactly 500 after all saves complete, and the entries must be the N most recent sessions (oldest entries are evicted first).

**Validates: Requirements 16.2**

---

### Property 16: Cumulative totals equal the sum of all sessions

*For any* sequence of saved sessions, `totals.tokens` must equal the sum of `tokens` across all sessions, `totals.carbon_mg` must equal the sum of `carbon_mg` across all sessions, and `totals.water_ml` must equal the sum of `water_ml` across all sessions.

**Validates: Requirements 16.3**

---

### Property 17: Per-platform totals equal the filtered sum of sessions

*For any* sequence of saved sessions and any `platform_id`, `per_platform[platform_id].tokens` must equal the sum of `tokens` across all sessions where `session.platform_id === platform_id`. The same must hold for `carbon_mg` and `water_ml`.

**Validates: Requirements 16.4**

---

### Property 18: Analysis pipeline makes no network calls without an explicit Gemini API key

*For any* prompt string, running the full analysis pipeline (token counting, carbon estimation, water estimation, scoring, classification) without a configured Gemini API key must complete without making any `fetch` or `XMLHttpRequest` calls. The pipeline must be fully self-contained.

**Validates: Requirements 20.1, 20.3**

---

### Property 19: Dashboard upload replaces seed data for all charts and the session table

*For any* valid JSON export file containing a `sessions` array, after the user uploads the file, every chart and the session table on the dashboard must display data derived exclusively from the uploaded sessions, not from the built-in seed data.

**Validates: Requirements 22.8**

---

## Error Handling

### Adapter Errors

- **Textarea not found**: All adapters wrap their selector logic in a try/catch. If no selector matches after exhausting all fallbacks, the adapter calls `console.warn('[Trace] Could not locate textarea on <platform>')` and returns without throwing. The extension remains loaded and will retry on the next SPA navigation.
- **SPA navigation race**: A `isInitialising` boolean flag prevents double-initialisation if two navigation events fire in quick succession.

### Analysis Pipeline Errors

- **js-tiktoken load failure**: The `loadEncoder()` function catches any error from `get_encoding()` and sets `enc = null`. All subsequent calls to `countTokens()` use the word-count fallback. The fallback is transparent to callers.
- **Invalid model ID**: `getEnergyPerToken()` uses nullish coalescing (`?? MODEL_ENERGY_TABLE['default']`) so any unknown model ID silently falls back to the default energy value.
- **Empty prompt**: An empty string produces 0 tokens, 0 carbon, 0 water, and a score of 95 (only the "no format specified" deduction applies). The overlay renders normally with zero values.

### Rewriter Errors

- **Gemini API timeout (3s)**: `AbortController` cancels the fetch. The `geminiRewrite()` function throws, and `rewriter.js` catches it and calls `localRewrite()` instead.
- **Gemini API non-2xx response**: The response status is checked; any non-2xx status causes `geminiRewrite()` to throw, triggering the same local fallback.
- **Gemini API malformed JSON response**: The response body is parsed in a try/catch. If parsing fails, the local fallback is used.
- **Local rewriter produces no changes**: If no rules match, the rewriter returns the original text unchanged with an empty `changes` array. The overlay displays "No changes suggested" rather than an empty list.

### Storage Errors

- **chrome.storage.local quota exceeded**: The 500-entry cap and the compact `Session` schema (no full prompt text beyond 200-char preview) keep storage well within Chrome's 10MB `local` storage quota. If a write fails, the error is caught and logged; the overlay still dismisses normally.
- **Corrupt storage data**: All reads from `chrome.storage.local` use nullish coalescing defaults (`?? []`, `?? {}`) so corrupt or missing data degrades gracefully to empty state.

### Dashboard Errors

- **Invalid JSON upload**: The `FileReader` result is parsed in a try/catch. If parsing fails or the `sessions` array is missing, the dashboard shows an error toast and reverts to seed data.
- **Empty sessions array**: All chart components handle empty arrays by rendering a "No data" placeholder rather than crashing.

---

## Testing Strategy

### Overview

The project uses a dual testing approach: example-based unit tests for specific behaviors and edge cases, and property-based tests for universal invariants. Both are complementary.

### Extension Testing

**Test runner**: Jest with jsdom for DOM simulation.

**Unit tests** cover:
- Each adapter's selector fallback logic (mock DOM structures)
- `setText` event dispatch for each platform
- Debounce timing (Jest fake timers)
- Graceful degradation when textarea is not found
- Popup tab rendering with mock storage data
- Settings save/load/clear operations
- Export JSON trigger
- Overlay rendering with specific result objects
- Overlay dismiss saves session
- Rewriter routing (Gemini key present vs absent)
- Gemini timeout fallback (fake timers + mock fetch)
- Gemini error response fallback

**Property-based tests** use [fast-check](https://github.com/dubzzz/fast-check) (JavaScript PBT library):

Each property test runs a minimum of 100 iterations. Tests are tagged with a comment referencing the design property:

```js
// Feature: trace-ai-layer, Property 1: Token counting is deterministic
test('countTokens is deterministic', () => {
  fc.assert(fc.property(fc.string(), (text) => {
    expect(countTokens(text)).toBe(countTokens(text));
  }), { numRuns: 100 });
});

// Feature: trace-ai-layer, Property 2: Fallback token count follows word-count formula
test('fallback token count = round(wordCount * 1.3)', () => {
  fc.assert(fc.property(fc.string(), (text) => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    expect(fallbackCountTokens(text)).toBe(Math.round(words * 1.3));
  }), { numRuns: 100 });
});

// Feature: trace-ai-layer, Property 5: Carbon estimation formula is exact
test('carbon formula holds for all token/model combinations', () => {
  fc.assert(fc.property(
    fc.integer({ min: 0, max: 100000 }),
    fc.constantFrom(...Object.keys(MODEL_ENERGY_TABLE)),
    (tokens, modelId) => {
      const result = estimateCarbon(tokens, modelId);
      const expected = ((tokens / 1000) * MODEL_ENERGY_TABLE[modelId] / 1000) * 475 * 1_000_000;
      expect(result.mg).toBeCloseTo(expected, 10);
    }
  ), { numRuns: 100 });
});

// Feature: trace-ai-layer, Property 8: Efficiency score is always in [0, 100]
test('efficiency score is always in [0, 100]', () => {
  fc.assert(fc.property(fc.string(), fc.integer({ min: 0, max: 10000 }), (text, tokens) => {
    const { score } = scoreEfficiency(text, tokens);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  }), { numRuns: 100 });
});

// Feature: trace-ai-layer, Property 10: Intent classification always returns a valid value
test('classifyIntent always returns a valid intent', () => {
  const VALID_INTENTS = ['coding', 'writing', 'research', 'exploratory', 'general'];
  fc.assert(fc.property(fc.string(), (text) => {
    expect(VALID_INTENTS).toContain(classifyIntent(text));
  }), { numRuns: 100 });
});

// Feature: trace-ai-layer, Property 15: Sessions array never exceeds 500 entries
test('sessions array never exceeds 500 entries', () => {
  fc.assert(fc.property(fc.integer({ min: 501, max: 1000 }), async (n) => {
    const storage = createMockStorage();
    for (let i = 0; i < n; i++) {
      await saveSession(storage, makeFakeSession(i));
    }
    const { sessions } = await storage.get(['sessions']);
    expect(sessions.length).toBeLessThanOrEqual(500);
  }), { numRuns: 20 }); // fewer runs due to async overhead
});
```

### Dashboard Testing

**Test runner**: Jest + React Testing Library.

**Unit/component tests** cover:
- `StatCard` renders correct values
- Each chart component renders without crashing with valid data
- Each chart component renders a "No data" placeholder with empty data
- `SessionTable` pagination and sorting
- File upload triggers data replacement
- Team page renders leaderboard with seed data
- Disclaimer text is present in all metric displays

**No property-based tests** are written for the dashboard. The dashboard is primarily a data visualisation layer with no complex transformation logic — example-based component tests and snapshot tests are more appropriate.

### Build Verification

The `Makefile` `all` target is verified by running `make all` in CI (GitHub Actions or equivalent) against a clean environment. The build must complete without errors.

### Manual Testing Checklist

- Load unpacked extension in Chrome, visit each of the 6 supported platforms
- Verify overlay appears after typing
- Verify "Optimise prompt" with and without Gemini API key
- Verify "Undo" restores original text
- Verify popup tabs display correct data
- Verify JSON export and re-import into dashboard
- Verify dashboard at localhost:3000 and localhost:3000/team
- Verify offline operation (disable network in DevTools)

# Implementation Plan: Trace AI Layer

## Overview

Build a two-part system: a Chrome Manifest V3 extension that intercepts AI prompts and runs a client-side analysis pipeline, and a Next.js 14 dashboard for personal and team analytics. The extension uses an adapter pattern for DOM isolation, a fully offline analysis pipeline, an overlay badge, a prompt rewriter, and chrome.storage.local persistence. The dashboard visualises session data with Recharts and supports JSON upload.

Implementation proceeds in dependency order: scaffolding → pipeline (with property tests) → adapters → overlay → rewriter → storage → popup → background worker → dashboard scaffolding → seed data → dashboard pages → README → final verification.

## Tasks

- [x] 1. Project scaffolding — Makefile, manifests, and directory structure
  - Create the top-level `Makefile` with an `all` target that: runs `npm install` in the extension root, bundles the extension with webpack/esbuild into `dist/`, runs `npm install` in `trace-dashboard/`, and exits 0 on success
  - Create `manifest.json` (MV3) declaring `manifest_version: 3`, `content_scripts` matching all 6 platform URLs, `permissions: ["storage", "activeTab", "downloads"]`, `host_permissions` for `https://generativelanguage.googleapis.com/*`, `action` pointing to `popup/popup.html`, `background.service_worker` pointing to `src/background.js`, and `web_accessible_resources` for adapter scripts and overlay CSS
  - Create `package.json` for the extension with Jest, fast-check, webpack (or esbuild), and js-tiktoken as dependencies; add `test` and `build` scripts
  - Create the full `src/` directory tree: `adapters/`, `pipeline/`, `rewriter/`, `overlay/`, `popup/`; create empty placeholder files for each module listed in the design file structure
  - Initialise `trace-dashboard/` with `npx create-next-app@14` (TypeScript, Tailwind CSS, App Router); add Recharts as a dependency; create `components/` and `lib/` directories
  - _Requirements: 25.1, 25.2_

- [x] 2. Analysis pipeline — tokenizer
  - Implement `src/pipeline/tokenizer.js`: export `loadEncoder()` (async, loads `cl100k_base` via js-tiktoken, sets module-level `enc`; catches errors and sets `enc = null`), `countTokens(text)` (uses `enc.encode` when available, falls back to `Math.round(wordCount * 1.3)`), and `fallbackCountTokens(text)` (always uses the word-count formula, exported for testing)
  - _Requirements: 5.1, 5.2, 5.3_

  - [x] 2.1 Write property test — Property 1: Token counting is deterministic
    - **Property 1: Token counting is deterministic**
    - For any string, `countTokens(text)` called twice must return the same value
    - **Validates: Requirements 5.1**

  - [x] 2.2 Write property test — Property 2: Fallback token count follows word-count formula
    - **Property 2: Fallback token count follows the word-count formula**
    - For any string, `fallbackCountTokens(text)` must equal `Math.round(wordCount * 1.3)`
    - **Validates: Requirements 5.2**

- [x] 3. Analysis pipeline — carbon and water estimator
  - Implement `src/pipeline/carbon.js`: export `MODEL_ENERGY_TABLE` (all 14 model entries from the design), `getEnergyPerToken(modelId)` (returns table value or `MODEL_ENERGY_TABLE['default']`), `estimateCarbon(tokens, modelId)` (exact formula: `((tokens / 1000) * whPer1000 / 1000) * 475 * 1_000_000`; returns `{ mg, isEstimate: true }`), `estimateWater(tokens)` (returns `{ ml: tokens * 0.0106, isEstimate: true }`), and `computeEquivalences(carbonMg, tokens)` (returns `{ phoneChargeSeconds: carbonMg * 2.1, googleSearches: carbonMg / 200, wordsEquivalent: tokens * 0.75 }`)
  - _Requirements: 6.3, 7.1, 7.2, 7.3, 8.1, 8.2, 9.1, 9.2, 9.3_

  - [x] 3.1 Write property test — Property 4: Model energy lookup
    - **Property 4: Model energy lookup returns correct value for known models and falls back to default for unknown models**
    - For any known model ID, `getEnergyPerToken` returns the exact table value; for any unknown string, returns the default value
    - **Validates: Requirements 6.3**

  - [x] 3.2 Write property test — Property 5: Carbon estimation formula is exact
    - **Property 5: Carbon estimation formula is exact**
    - For any token count and model ID, `estimateCarbon(tokens, modelId).mg` must equal `((tokens / 1000) * MODEL_ENERGY_TABLE[modelId] / 1000) * 475 * 1_000_000`
    - **Validates: Requirements 7.1, 7.2**

  - [x] 3.3 Write property test — Property 6: Water estimation formula is exact
    - **Property 6: Water estimation formula is exact**
    - For any token count, `estimateWater(tokens).ml` must equal `tokens * 0.0106`
    - **Validates: Requirements 8.1**

  - [x] 3.4 Write property test — Property 7: Equivalence conversions are exact
    - **Property 7: Equivalence conversions are exact**
    - For any `carbon_mg` and token count, all three equivalence formulas must hold simultaneously
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [x] 4. Analysis pipeline — efficiency scorer
  - Implement `src/pipeline/scorer.js`: export `FILLER_OPENERS`, `VAGUE_WORDS`, `FORMAT_KEYWORDS`, `REDUNDANT_MARKERS` arrays (exact values from design), `gradeFromScore(score)` (returns `{ grade, gradeColor }` per the five grade boundaries), and `scoreEfficiency(text, tokens)` (applies all six deduction rules, clamps to `[0, 100]`, returns `{ score, grade, gradeColor }`)
  - _Requirements: 10.1, 10.2, 10.3_

  - [x] 4.1 Write property test — Property 8: Efficiency score is always in [0, 100]
    - **Property 8: Efficiency score is always in the range [0, 100]**
    - For any string and token count, `scoreEfficiency(text, tokens).score` must be in `[0, 100]`
    - **Validates: Requirements 10.1**

  - [x] 4.2 Write property test — Property 9: Grade boundaries are correct for all scores
    - **Property 9: Grade boundaries are correct for all scores**
    - For any integer score in `[0, 100]`, `gradeFromScore(score)` must return the correct grade letter and colour
    - **Validates: Requirements 10.2**

- [x] 5. Analysis pipeline — intent classifier
  - Implement `src/pipeline/classifier.js`: export `INTENT_KEYWORDS` map (exact keyword lists from design) and `classifyIntent(text)` (keyword-match scoring, returns the highest-scoring intent or `'general'` when all scores are 0)
  - _Requirements: 11.1, 11.2_

  - [x] 5.1 Write property test — Property 10: Intent classification always returns a valid intent value
    - **Property 10: Intent classification always returns a valid intent value**
    - For any string, `classifyIntent(text)` must return one of `['coding', 'writing', 'research', 'exploratory', 'general']` and never `null`, `undefined`, or any other string
    - **Validates: Requirements 11.1**

- [x] 6. Analysis pipeline — orchestrator and result object
  - Implement `src/pipeline/pipeline.js`: export `analyse(promptText, modelId)` (async; calls `countTokens`, `estimateCarbon`, `estimateWater`, `computeEquivalences`, `scoreEfficiency`, `classifyIntent`; assembles and returns the full `ResultObject` including `tokenLabel: "est."` and a `suggestion` string derived from the scorer's deductions)
  - _Requirements: 5.3, 6.3, 7.3, 8.2, 9.1, 9.2, 9.3, 10.3, 11.2_

  - [x] 6.1 Write property test — Property 3: Result object always carries the "est." token label
    - **Property 3: Result object always carries the "est." token label**
    - For any string passed through `analyse()`, the returned result must have `tokenLabel === "est."`
    - **Validates: Requirements 5.3**

  - [x] 6.2 Write property test — Property 18: Analysis pipeline makes no network calls without a Gemini API key
    - **Property 18: Analysis pipeline makes no network calls without an explicit Gemini API key**
    - For any prompt string, running `analyse()` without a configured API key must complete without calling `fetch` or `XMLHttpRequest`
    - **Validates: Requirements 20.1, 20.3**

- [x] 7. Checkpoint — pipeline tests pass
  - Ensure all pipeline unit and property tests pass (`npm test -- --testPathPattern=pipeline`); ask the user if any questions arise before continuing to adapters.

- [x] 8. Platform adapters — Priority 1 (ChatGPT, Claude, Gemini)
  - Implement `src/adapters/chatgpt.js`: selector fallbacks (`#prompt-textarea`, `[data-id="root"] textarea`, `form textarea`), 800 ms debounce on `input` event, `getText()` reads `element.value`, `setText(text)` sets `element.value` and dispatches `new Event('input', {bubbles:true})` and `new Event('change', {bubbles:true})`, `MutationObserver` SPA detection with `isInitialising` guard, `teardown()` removes listeners
  - Implement `src/adapters/claude.js`: selector fallbacks (`.ProseMirror`, `[contenteditable="true"]`, `div[data-placeholder]`), `getText()` reads `element.innerText`, `setText(text)` uses `document.execCommand('selectAll')` then `document.execCommand('insertText', false, text)`, same SPA/debounce/teardown pattern
  - Implement `src/adapters/gemini.js`: recursive `queryShadowRoot(root, selector)` helper, selector fallbacks (`rich-textarea textarea`, `[data-test-id="input-area"] textarea`), `setText` dispatches `input` and `change` events, same SPA/debounce/teardown pattern
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 8.1 Write unit tests for Priority 1 adapters
    - Test selector fallback logic with mock DOM structures for each adapter
    - Test `setText` event dispatch for ChatGPT (React events), Claude (execCommand), and Gemini (input/change)
    - Test debounce timing using Jest fake timers
    - Test graceful degradation when no selector matches (warning logged, no exception thrown)
    - _Requirements: 1.2, 1.4, 1.6, 2.2, 2.4, 2.6, 3.2, 3.4, 3.6_

- [x] 9. Platform adapters — Priority 2 (Perplexity, Mistral, Copilot)
  - Implement `src/adapters/perplexity.js` and `src/adapters/mistral.js`: standard textarea selector fallbacks, React-compatible `setText` event dispatch, same SPA/debounce/teardown pattern, graceful degradation on selector failure
  - Implement `src/adapters/copilot.js`: searches `document.querySelector('iframe')?.contentDocument` first, then falls back to main document; same textarea selector fallbacks and event dispatch pattern
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 9.1 Write unit tests for Priority 2 adapters
    - Test Perplexity and Mistral selector fallbacks and event dispatch with mock DOM
    - Test Copilot iframe context search and main-document fallback
    - Test graceful degradation for all three adapters
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 10. Content script — platform detection and adapter loading
  - Implement `src/content.js`: detect current platform from `location.hostname` (map to one of the 6 platform IDs), dynamically import the matching adapter module, call `adapter.init()`, and wire the adapter's text-change callback to `pipeline.analyse()` followed by `overlay.renderOverlay(result, adapter)`
  - Add model detection logic: each adapter reads the active model selector from the platform UI and exposes a `getModelId()` method; `content.js` passes the result to `pipeline.analyse()`; falls back to `"default"` when detection fails
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 4.2, 4.3, 6.1, 6.2_

- [x] 11. Overlay renderer
  - Implement `src/overlay/overlay.js`: `renderOverlay(result, adapter)` creates/updates `<div id="trace-overlay">` injected as a sibling after the textarea's parent container; renders all required fields (platform label, grade letter with colour, score, token count with "est." suffix, carbon with disclaimer, water with disclaimer, equivalences when `show_equivalences` is enabled, suggestion string, "Optimise prompt" button, "Dismiss" button)
  - Implement the optimise flow: clicking "Optimise prompt" shows a loading spinner, calls `rewriter.rewrite(originalText, apiKey)`, then calls `renderRewriteResult(rewriteResult)` which displays original text, rewritten text, token delta, percentage saved, up to 3 labelled changes, and source label
  - Implement apply/undo: "Apply" calls `adapter.setText(rewritten)` and changes button label to "Undo"; "Undo" calls `adapter.setText(original)`; "Dismiss" hides the overlay and calls `saveSession(result)`
  - Create `src/overlay/overlay.css` with styles for the badge, grade colour classes (green/teal/amber/orange/red), loading spinner, and rewrite result panel
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 13.2, 13.5, 14.2, 15.1, 15.2, 15.3, 24.1_

  - [x] 11.1 Write property test — Property 11: Overlay renders all required fields for any valid result object
    - **Property 11: Overlay renders all required fields for any valid result object**
    - For any valid `ResultObject`, the HTML produced by `renderOverlay(result)` must contain all required fields listed in the design
    - **Validates: Requirements 12.2, 24.1**

  - [x] 11.2 Write property test — Property 12: Rewrite result display contains all required fields
    - **Property 12: Rewrite result display contains all required fields for any valid RewriteResult**
    - For any valid `RewriteResult`, the rendered rewrite UI must contain all required fields (original, rewritten, token delta, percentage saved, up to 3 changes, source label)
    - **Validates: Requirements 13.5, 14.2**

  - [x] 11.3 Write property test — Property 13: Apply-then-undo is a round trip
    - **Property 13: Apply-then-undo is a round trip**
    - For any original prompt string, after applying a rewrite and clicking "Undo", the textarea content must equal the original string exactly
    - **Validates: Requirements 15.3**

  - [x] 11.4 Write unit tests for overlay
    - Test overlay renders with specific result objects (mock DOM)
    - Test "Dismiss" triggers `saveSession`
    - Test `overlay_enabled: false` setting prevents rendering
    - _Requirements: 12.1, 12.4, 12.5_

- [x] 12. Rewriter — local rule-based path
  - Implement `src/rewriter/local-rewriter.js`: `VERBOSE_REPLACEMENTS` array (all regex/replacement pairs from the design), `FILLER_REMOVALS` patterns, `localRewrite(text)` applies all replacements, collapses whitespace, returns `{ rewritten, changes: changes.slice(0, 3), source: 'Local' }`; when no rules match, returns original text with empty `changes` array
  - _Requirements: 14.1, 14.2, 20.1, 20.2_

- [x] 13. Rewriter — Gemini API path and orchestrator
  - Implement `src/rewriter/gemini-rewriter.js`: POST to `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}`, body with system prompt instructing JSON response `{ rewritten, changes }`, `AbortController` with 3000 ms timeout, throws on abort or non-2xx status, parses response JSON in try/catch and throws on malformed response
  - Implement `src/rewriter/rewriter.js`: `rewrite(originalText, apiKey)` — if `apiKey` is present, calls `geminiRewrite` and catches any error to fall back to `localRewrite`; if no `apiKey`, calls `localRewrite` directly; computes `tokenDelta` and `percentSaved` and merges into the returned `RewriteResult`
  - _Requirements: 13.1, 13.3, 13.4, 14.1, 20.3_

  - [x] 13.1 Write unit tests for rewriter
    - Test Gemini timeout triggers local fallback (Jest fake timers + mock fetch)
    - Test Gemini non-2xx response triggers local fallback
    - Test Gemini malformed JSON triggers local fallback
    - Test no-API-key path calls local rewriter directly
    - _Requirements: 13.3, 13.4, 14.1_

- [x] 14. Session storage module
  - Implement storage helpers in `src/background.js` (or a dedicated `src/storage.js` imported by background): `saveSession(session)` reads `sessions`, `totals`, `per_platform` from `chrome.storage.local`; enforces 500-entry FIFO cap (`sessions.shift()` when `>= 500`); pushes new session; calls `updateTotals` and `updatePerPlatform`; writes back atomically
  - Implement `updateTotals(totals, session)`: increments `tokens`, `carbon_mg`, `water_ml`, `session_count`
  - Implement `updatePerPlatform(perPlatform, session)`: increments the same four fields under `perPlatform[session.platform_id]`, initialising the key if absent
  - All reads use nullish coalescing defaults (`?? []`, `?? {}`) for corrupt/missing data resilience
  - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [x] 14.1 Write property test — Property 14: Session storage preserves all required fields
    - **Property 14: Session storage preserves all required fields**
    - For any valid `ResultObject`, the session entry written to storage must contain all required fields matching the result object values
    - **Validates: Requirements 16.1**

  - [x] 14.2 Write property test — Property 15: Sessions array never exceeds 500 entries
    - **Property 15: Sessions array never exceeds 500 entries**
    - For any sequence of N > 500 session saves, the `sessions` array must have length exactly 500 and contain the N most recent sessions
    - **Validates: Requirements 16.2**

  - [x] 14.3 Write property test — Property 16: Cumulative totals equal the sum of all sessions
    - **Property 16: Cumulative totals equal the sum of all sessions**
    - For any sequence of saved sessions, `totals.tokens`, `totals.carbon_mg`, and `totals.water_ml` must equal the respective sums across all sessions
    - **Validates: Requirements 16.3**

  - [x] 14.4 Write property test — Property 17: Per-platform totals equal the filtered sum of sessions
    - **Property 17: Per-platform totals equal the filtered sum of sessions**
    - For any sequence of saved sessions and any `platform_id`, `per_platform[platform_id]` totals must equal the sum of that field across all sessions with matching `platform_id`
    - **Validates: Requirements 16.4**

- [ ] 15. Extension popup
  - Create `src/popup/popup.html`: three-tab layout (Session Summary, Last Prompt, Settings) with tab navigation buttons and content panels
  - Implement `src/popup/popup.js`:
    - Tab 1: reads `totals` and `sessions` from `chrome.storage.local`, renders total tokens, carbon, water, grade distribution counts, and "Open dashboard" button (`chrome.tabs.create({ url: settings.dashboard_url })`)
    - Tab 2: reads `sessions[sessions.length - 1]`, renders prompt preview, grade, score, intent, carbon, water, detected issues, suggestion
    - Tab 3: reads/writes `settings`; renders Gemini API key input with status indicator, three toggle switches (`overlay_enabled`, `rewriter_enabled`, `show_equivalences`), "Export JSON" button (triggers `chrome.downloads.download()` with a Blob URL of the full storage JSON), "Clear data" button (calls `chrome.storage.local.clear()`), dashboard link
  - Create `src/popup/popup.css` with tab styles and layout
  - _Requirements: 17.1, 17.2, 18.1, 19.1, 19.2, 19.3, 19.4, 19.5, 21.1_

  - [x] 15.1 Write unit tests for popup
    - Test Tab 1 renders correct totals and grade distribution with mock storage data
    - Test Tab 2 renders last session fields correctly
    - Test Tab 3 settings save/load/clear operations with mock storage
    - Test "Export JSON" triggers download with correct data shape
    - _Requirements: 17.1, 18.1, 19.1, 19.3, 19.4_

- [~] 16. Background service worker
  - Implement `src/background.js`: register message listeners for `SAVE_SESSION`, `GET_STORAGE`, and `CLEAR_STORAGE` message types; route each to the corresponding storage helper; export storage helpers so they can be imported by tests
  - _Requirements: 16.1, 16.2, 16.3, 16.4_

- [~] 17. Checkpoint — extension tests pass
  - Run the full extension test suite (`npm test`); ensure all unit tests and property tests pass; ask the user if any questions arise before starting the dashboard.

- [~] 18. Next.js dashboard — scaffolding and shared components
  - Configure `trace-dashboard/next.config.js` for App Router; verify Tailwind CSS is configured in `tailwind.config.ts` and `globals.css`
  - Create `trace-dashboard/lib/data-utils.ts`: export helper functions for aggregating session data (grade distribution counts, intent breakdown, platform breakdown, last-30-sessions carbon series, per-platform totals)
  - Create `trace-dashboard/components/StatCard.tsx`: accepts `label`, `value`, `unit`, `disclaimer?` props; renders a card with the value and an optional disclaimer note
  - _Requirements: 22.1, 24.2_

- [~] 19. Next.js dashboard — seed data
  - Create `trace-dashboard/lib/seed-data.ts`: export `PERSONAL_SEED_DATA` (30 representative `Session` objects covering all platforms, intents, and grades) and `TEAM_SEED_DATA` (the 5 hardcoded team members from the design with `name`, `prompts`, `avgGrade`, `tokens`, `topIntent`, `intentPct`)
  - Ensure no API keys or credentials appear in this file
  - _Requirements: 22.7, 23.1, 21.2_

- [~] 20. Next.js dashboard — chart components
  - Create `trace-dashboard/components/Co2LineChart.tsx` (`'use client'`): `LineChart` from Recharts showing `carbon_mg` for the last 30 sessions; handles empty array with "No data" placeholder
  - Create `trace-dashboard/components/GradeBarChart.tsx` (`'use client'`): `BarChart` showing A/B/C/D/F counts; handles empty array
  - Create `trace-dashboard/components/IntentDonutChart.tsx` (`'use client'`): `PieChart` with `innerRadius` showing intent breakdown; handles empty array
  - Create `trace-dashboard/components/PlatformDonutChart.tsx` (`'use client'`): `PieChart` with `innerRadius` showing platform breakdown; handles empty array
  - Create `trace-dashboard/components/TeamBarChart.tsx` (`'use client'`): `BarChart` showing tokens per team member
  - _Requirements: 22.2, 22.3, 22.4, 22.5, 23.3_

- [~] 21. Next.js dashboard — session table component
  - Create `trace-dashboard/components/SessionTable.tsx` (`'use client'`): accepts `sessions: Session[]`; local state for sort column, sort direction, and current page; renders 10 rows per page with pagination controls; all column headers are clickable to toggle sort; renders "No data" placeholder for empty array
  - _Requirements: 22.6_

- [~] 22. Next.js dashboard — personal analytics page
  - Implement `trace-dashboard/app/page.tsx`: React state holding `sessions` (initialised to `PERSONAL_SEED_DATA`); `<input type="file" accept=".json">` with `FileReader` handler that parses the uploaded file, validates `sessions` array presence, replaces state on success, shows error toast and reverts to seed data on failure; renders four `StatCard` components, `Co2LineChart`, `GradeBarChart`, `IntentDonutChart`, `PlatformDonutChart`, and `SessionTable`; all metric displays include disclaimer text
  - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8, 24.2_

  - [~] 22.1 Write property test — Property 19: Dashboard upload replaces seed data for all charts and the session table
    - **Property 19: Dashboard upload replaces seed data for all charts and the session table**
    - For any valid JSON export containing a `sessions` array, after upload every chart and the session table must display data derived exclusively from the uploaded sessions
    - **Validates: Requirements 22.8**

  - [~] 22.2 Write component tests for personal analytics page
    - Test `StatCard` renders correct values and disclaimer
    - Test each chart component renders without crashing with valid data and renders "No data" placeholder with empty data
    - Test `SessionTable` pagination and sorting
    - Test file upload triggers data replacement; invalid JSON shows error and reverts to seed data
    - _Requirements: 22.1, 22.6, 22.7, 22.8_

- [~] 23. Next.js dashboard — team view page
  - Create `trace-dashboard/components/TeamLeaderboard.tsx`: accepts `members: TeamMember[]` and `sortMetric` prop; renders a sortable table ranked by the chosen metric (default: total tokens)
  - Create `trace-dashboard/components/InsightCard.tsx`: accepts `title` and `body` props; renders a callout card
  - Implement `trace-dashboard/app/team/page.tsx`: always uses `TEAM_SEED_DATA`; renders team-level stat cards (total tokens, carbon, water), `TeamLeaderboard`, `TeamBarChart`, `PlatformDonutChart` (team-level), and at least two `InsightCard` components highlighting notable statistics; all metric displays include disclaimer text
  - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 24.2_

  - [~] 23.1 Write component tests for team view page
    - Test team page renders leaderboard with seed data
    - Test team-level stat cards display correct aggregated values
    - Test insight cards are present and non-empty
    - Test disclaimer text is present in all metric displays
    - _Requirements: 23.1, 23.2, 23.5, 24.2_

- [~] 24. README
  - Create `README.md` at the repository root with all required sections: title, description, how it works, data methodology with all three citations (Luccioni et al. 2023 arXiv:2311.16863, Li et al. 2023 arXiv:2304.03271, IEA World Energy Outlook 2023 475 g CO₂/kWh), installation instructions, the three manual setup steps (optional Gemini API key, loading unpacked extension from `dist/` in Chrome, running the dashboard with `cd trace-dashboard && npm install && npm run dev`), team section, and hackathon context
  - Verify no API keys or credentials appear anywhere in the README
  - _Requirements: 24.3, 25.3, 25.4, 21.1, 21.2_

- [~] 25. Final checkpoint — make all and manual checklist
  - Run `make all` from the repository root and confirm it exits 0 with no errors
  - Verify the extension `dist/` folder is populated with bundled output
  - Verify `trace-dashboard/` builds without TypeScript or Tailwind errors (`npm run build` inside `trace-dashboard/`)
  - Ensure all tests pass (`npm test` in the extension root; `npm test` in `trace-dashboard/`)
  - Ask the user if any questions arise; provide the manual testing checklist from the design document for the user to run against a live browser

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; all 19 correctness properties are covered by the `*` sub-tasks
- Each task references specific requirements for traceability
- Checkpoints (tasks 7, 17, 25) ensure incremental validation before moving to the next phase
- Property tests use fast-check with a minimum of 100 iterations per property (20 for async storage tests)
- The dashboard has no property-based tests — example-based component tests are more appropriate for a data visualisation layer
- No API keys or credentials may appear in any source file (Requirements 21.1, 21.2)

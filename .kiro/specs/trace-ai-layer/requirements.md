# Requirements Document

## Introduction

Trace AI Layer is a two-part system for measuring and reducing the environmental cost of AI prompt usage.

**Part 1 — Chrome Extension (Manifest V3):** A content-script-based extension that works across all major AI chat platforms. It intercepts prompts before submission, scores their efficiency, estimates carbon and water footprint, and offers an AI-powered or local rule-based rewrite. All analysis runs entirely client-side with no mandatory network calls.

**Part 2 — Next.js Dashboard (localhost:3000):** A local web application that visualises personal usage analytics, session history, and a team leaderboard. Data is sourced from a JSON export of the extension's storage or from built-in seed data.

The system operates fully offline (except for the optional Gemini rewrite feature), requires no paid services, and exposes only three manual setup steps to the user.

---

## Glossary

- **Extension**: The Chrome Manifest V3 browser extension component of Trace AI Layer.
- **Dashboard**: The Next.js web application running on localhost:3000.
- **Adapter**: A per-platform module that handles all DOM interaction for a specific AI chat platform.
- **Analysis_Pipeline**: The client-side module that receives a plain prompt string and returns a result object containing all computed metrics.
- **Overlay**: The badge UI element injected below the active textarea on a supported platform page.
- **Popup**: The browser-action popup opened by clicking the extension icon.
- **Rewriter**: The module that produces an optimised version of a prompt, using either the Gemini API or local rule-based logic.
- **Session**: A single prompt submission event, including all computed metrics, stored as one entry in chrome.storage.local.
- **Token**: A sub-word unit used by large language models; estimated via js-tiktoken (cl100k_base encoding) or word count × 1.3 as fallback.
- **Carbon_Estimate**: The estimated CO₂-equivalent mass (in milligrams) produced by processing a prompt, derived from energy consumption and grid intensity.
- **Water_Estimate**: The estimated water consumption (in millilitres) associated with processing a prompt.
- **Grade**: A letter (A–F) and colour code summarising the efficiency score of a prompt.
- **Platform_ID**: A string identifier for a supported AI chat platform (e.g., `chatgpt`, `claude`, `gemini`).
- **Model_ID**: A string identifier for the specific AI model detected as active on a platform (e.g., `gpt-4o`, `claude-3-5-sonnet`).
- **Seed_Data**: Hardcoded representative data used to populate the Dashboard when no real export is available.
- **Gemini_API**: The optional free Gemini API from aistudio.google.com, used by the Rewriter when a key is configured.

---

## Requirements

### Requirement 1: Platform Adapter — ChatGPT

**User Story:** As a user on chat.openai.com or chatgpt.com, I want the extension to detect my prompt and show an overlay, so that I can see its environmental cost before submitting.

#### Acceptance Criteria

1. WHEN the Extension is loaded on `chat.openai.com` or `chatgpt.com`, THE Extension SHALL inject the ChatGPT Adapter without console errors.
2. WHEN the ChatGPT Adapter initialises, THE ChatGPT_Adapter SHALL locate the active prompt textarea using multiple CSS selector fallbacks.
3. WHEN the user types in the ChatGPT textarea, THE ChatGPT_Adapter SHALL extract the prompt text as a plain string after an 800 ms debounce.
4. WHEN the ChatGPT_Adapter injects optimised text into the textarea, THE ChatGPT_Adapter SHALL dispatch synthetic React-compatible input and change events so the platform registers the new value.
5. WHEN a single-page-app navigation occurs on ChatGPT, THE ChatGPT_Adapter SHALL re-initialise and re-attach all listeners within 2 seconds.
6. IF the ChatGPT_Adapter cannot locate the textarea after exhausting all selectors, THEN THE ChatGPT_Adapter SHALL log a warning and exit without throwing an uncaught exception.

---

### Requirement 2: Platform Adapter — Claude

**User Story:** As a user on claude.ai, I want the extension to detect my prompt and show an overlay, so that I can see its environmental cost before submitting.

#### Acceptance Criteria

1. WHEN the Extension is loaded on `claude.ai`, THE Extension SHALL inject the Claude Adapter without console errors.
2. WHEN the Claude_Adapter initialises, THE Claude_Adapter SHALL locate the ProseMirror editor element using multiple CSS selector fallbacks.
3. WHEN the user types in the Claude editor, THE Claude_Adapter SHALL extract the prompt text as a plain string after an 800 ms debounce.
4. WHEN the Claude_Adapter injects optimised text into the ProseMirror editor, THE Claude_Adapter SHALL use `document.execCommand` or an equivalent DOM mutation so the platform registers the new value.
5. WHEN a single-page-app navigation occurs on Claude, THE Claude_Adapter SHALL re-initialise and re-attach all listeners within 2 seconds.
6. IF the Claude_Adapter cannot locate the editor after exhausting all selectors, THEN THE Claude_Adapter SHALL log a warning and exit without throwing an uncaught exception.

---

### Requirement 3: Platform Adapter — Gemini

**User Story:** As a user on gemini.google.com, I want the extension to detect my prompt and show an overlay, so that I can see its environmental cost before submitting.

#### Acceptance Criteria

1. WHEN the Extension is loaded on `gemini.google.com`, THE Extension SHALL inject the Gemini Adapter without console errors.
2. WHEN the Gemini_Adapter initialises, THE Gemini_Adapter SHALL search recursively through shadow DOM roots to locate the active prompt textarea.
3. WHEN the user types in the Gemini textarea, THE Gemini_Adapter SHALL extract the prompt text as a plain string after an 800 ms debounce.
4. WHEN the Gemini_Adapter injects optimised text into the textarea, THE Gemini_Adapter SHALL dispatch the appropriate DOM events so the platform registers the new value.
5. WHEN a single-page-app navigation occurs on Gemini, THE Gemini_Adapter SHALL re-initialise and re-attach all listeners within 2 seconds.
6. IF the Gemini_Adapter cannot locate the textarea after exhausting all selectors and shadow root traversal, THEN THE Gemini_Adapter SHALL log a warning and exit without throwing an uncaught exception.

---

### Requirement 4: Platform Adapters — Priority 2 Platforms

**User Story:** As a user on Perplexity, Mistral, or Copilot, I want the extension to attempt to detect my prompt, so that I can benefit from environmental tracking on additional platforms.

#### Acceptance Criteria

1. WHEN the Extension is loaded on `perplexity.ai`, THE Extension SHALL inject the Perplexity Adapter and attempt textarea detection using multiple CSS selector fallbacks.
2. WHEN the Extension is loaded on `chat.mistral.ai`, THE Extension SHALL inject the Mistral Adapter and attempt textarea detection using multiple CSS selector fallbacks.
3. WHEN the Extension is loaded on `copilot.microsoft.com`, THE Extension SHALL inject the Copilot Adapter and search within the correct iframe context to locate the active textarea.
4. IF any Priority 2 Adapter cannot locate the textarea, THEN THE Adapter SHALL log a warning and exit without throwing an uncaught exception.

---

### Requirement 5: Token Counting

**User Story:** As a user, I want the extension to count the tokens in my prompt accurately, so that environmental estimates are based on a realistic token count.

#### Acceptance Criteria

1. WHEN the Analysis_Pipeline receives a prompt string, THE Analysis_Pipeline SHALL count tokens using the js-tiktoken library with the `cl100k_base` encoding.
2. IF the js-tiktoken library fails to load or throws an error, THEN THE Analysis_Pipeline SHALL fall back to estimating token count as `word_count × 1.3`, rounded to the nearest integer.
3. THE Analysis_Pipeline SHALL label all token counts with the suffix `"est."` in every user-facing display.

---

### Requirement 6: Model Detection

**User Story:** As a user, I want the extension to detect which AI model I am using, so that carbon estimates reflect the correct model's energy profile.

#### Acceptance Criteria

1. WHEN an Adapter initialises, THE Adapter SHALL read the active model identifier from the platform UI and map it to a Model_ID string.
2. WHEN no model can be detected from the platform UI, THE Adapter SHALL pass the Model_ID `"default"` to the Analysis_Pipeline.
3. THE Analysis_Pipeline SHALL accept a Model_ID string and select the corresponding energy-per-1000-tokens value from the model energy table.

---

### Requirement 7: Carbon Footprint Estimation

**User Story:** As a user, I want to see the estimated carbon footprint of my prompt, so that I understand its environmental impact.

#### Acceptance Criteria

1. WHEN the Analysis_Pipeline receives a token count and a Model_ID, THE Analysis_Pipeline SHALL compute energy consumption as `energy_wh = (tokens / 1000) × model_wh_per_1000_tokens` using the energy table from Luccioni et al. (2023), arXiv:2311.16863.
2. THE Analysis_Pipeline SHALL compute carbon as `carbon_mg = (energy_wh / 1000) × 475 × 1_000_000`, using the grid intensity of 475 g CO₂/kWh from IEA World Energy Outlook 2023.
3. THE Analysis_Pipeline SHALL expose the carbon result in milligrams (mg) in the result object.
4. WHEN carbon metrics are displayed to the user, THE Overlay SHALL show a disclaimer indicating the value is an estimate based on cited methodology.

---

### Requirement 8: Water Footprint Estimation

**User Story:** As a user, I want to see the estimated water consumption of my prompt, so that I understand its water impact.

#### Acceptance Criteria

1. WHEN the Analysis_Pipeline receives a token count, THE Analysis_Pipeline SHALL compute water consumption as `water_ml = tokens × 0.0106`, based on Li et al. (2023), arXiv:2304.03271.
2. THE Analysis_Pipeline SHALL expose the water result in millilitres (ml) in the result object.
3. WHEN water metrics are displayed to the user, THE Overlay SHALL show a disclaimer indicating the value is an estimate based on cited methodology.

---

### Requirement 9: Equivalence Conversions

**User Story:** As a user, I want to see relatable equivalences for carbon and token metrics, so that I can intuitively understand the scale of the impact.

#### Acceptance Criteria

1. WHEN the Analysis_Pipeline computes a carbon result, THE Analysis_Pipeline SHALL compute `phone_charge_seconds = carbon_mg × 2.1`.
2. WHEN the Analysis_Pipeline computes a carbon result, THE Analysis_Pipeline SHALL compute `google_searches_equivalent = carbon_mg / 200`.
3. WHEN the Analysis_Pipeline computes a token count, THE Analysis_Pipeline SHALL compute `words_equivalent = tokens × 0.75`.
4. WHERE the `show_equivalences` setting is enabled, THE Overlay SHALL display all three equivalence values alongside the primary metrics.

---

### Requirement 10: Efficiency Scoring

**User Story:** As a user, I want my prompt to receive an efficiency score and grade, so that I know how well-structured it is and where to improve.

#### Acceptance Criteria

1. WHEN the Analysis_Pipeline receives a prompt string, THE Analysis_Pipeline SHALL compute an efficiency score starting at 100 and applying the following deductions:
   - Deduct 5 points per filler opener detected, up to a maximum deduction of 25 points.
   - Deduct 3 points per vague word detected, up to a maximum deduction of 15 points.
   - Deduct 10 points if the prompt exceeds 500 tokens.
   - Deduct 5 points if the prompt exceeds 300 tokens but does not exceed 500 tokens.
   - Deduct 5 points if no output format is specified in the prompt.
   - Deduct 10 points if redundant context markers are present and the prompt exceeds 100 tokens.
2. THE Analysis_Pipeline SHALL assign a Grade based on the final score: A (90–100, green), B (80–89, teal), C (70–79, amber), D (60–69, orange), F (below 60, red).
3. THE Analysis_Pipeline SHALL include the score, Grade letter, and Grade colour in the result object.

---

### Requirement 11: Intent Classification

**User Story:** As a user, I want my prompt to be classified by intent, so that I can see a breakdown of how I use AI across different task types.

#### Acceptance Criteria

1. WHEN the Analysis_Pipeline receives a prompt string, THE Analysis_Pipeline SHALL classify the intent using keyword matching into one of: `coding`, `writing`, `research`, `exploratory`, or `general`.
2. THE Analysis_Pipeline SHALL include the classified intent string in the result object.

---

### Requirement 12: Overlay Badge

**User Story:** As a user typing a prompt, I want an overlay badge to appear below the textarea, so that I can see the analysis results before I submit.

#### Acceptance Criteria

1. WHEN the Analysis_Pipeline returns a result object, THE Overlay SHALL render a badge below the active textarea within 1 second of the user stopping typing.
2. THE Overlay SHALL display: platform label, Grade letter (colour-coded), efficiency score, token count (labelled "est."), Carbon_Estimate, Water_Estimate, equivalence values, a suggestion string, an "Optimise prompt" button, and a "Dismiss" button.
3. THE Overlay SHALL be positioned inline in the document flow (not fixed or absolutely positioned relative to the viewport).
4. WHEN the user clicks "Dismiss", THE Overlay SHALL hide itself and save the Session to chrome.storage.local.
5. WHERE the `overlay_enabled` setting is disabled, THE Overlay SHALL not render on any platform.

---

### Requirement 13: Prompt Rewriter — Gemini API Path

**User Story:** As a user with a Gemini API key configured, I want to click "Optimise prompt" and receive an AI-rewritten version, so that I can reduce token count and improve clarity.

#### Acceptance Criteria

1. WHEN the user clicks "Optimise prompt" and a Gemini API key is present in settings, THE Rewriter SHALL call the Gemini API (`gemini-2.0-flash` model) with the original prompt.
2. WHEN the Gemini API call is initiated, THE Overlay SHALL display a loading state.
3. IF the Gemini API call does not respond within 3 seconds, THEN THE Rewriter SHALL cancel the request and fall back to the local rule-based rewriter.
4. IF the Gemini API call returns an error response, THEN THE Rewriter SHALL fall back to the local rule-based rewriter.
5. WHEN the Rewriter returns a result, THE Overlay SHALL display the original prompt, the rewritten prompt, the token delta, the percentage of tokens saved, up to 3 labelled changes made, and a label indicating `"Gemini"` as the rewrite source.

---

### Requirement 14: Prompt Rewriter — Local Fallback Path

**User Story:** As a user without a Gemini API key, I want to click "Optimise prompt" and receive a locally rewritten version, so that the feature works fully offline.

#### Acceptance Criteria

1. WHEN the user clicks "Optimise prompt" and no Gemini API key is present in settings, THE Rewriter SHALL apply local rule-based rewriting: remove filler phrases, replace verbose phrases with concise equivalents, and collapse redundant whitespace.
2. WHEN the local Rewriter returns a result, THE Overlay SHALL display the original prompt, the rewritten prompt, the token delta, the percentage of tokens saved, up to 3 labelled changes made, and a label indicating `"Local"` as the rewrite source.

---

### Requirement 15: Rewrite Apply and Undo

**User Story:** As a user reviewing a rewritten prompt, I want to apply it to the textarea or undo the change, so that I remain in control of what I submit.

#### Acceptance Criteria

1. WHEN the Rewriter returns a result, THE Overlay SHALL replace the textarea content with the rewritten prompt using the platform's Adapter injection method.
2. WHEN the textarea content has been replaced, THE Overlay SHALL change the "Optimise prompt" button label to "Undo".
3. WHEN the user clicks "Undo", THE Overlay SHALL restore the original prompt text to the textarea using the platform's Adapter injection method.

---

### Requirement 16: Session Storage

**User Story:** As a user, I want each prompt analysis to be saved locally, so that I can review my history and usage trends.

#### Acceptance Criteria

1. WHEN a Session is saved, THE Extension SHALL write the Session entry to the `sessions` array in chrome.storage.local, including: timestamp, Platform_ID, Model_ID, token count, Carbon_Estimate, Water_Estimate, efficiency score, Grade, intent, and original prompt text.
2. THE Extension SHALL maintain a maximum of 500 Session entries in chrome.storage.local, removing the oldest entry when the limit is exceeded.
3. THE Extension SHALL maintain a `totals` object in chrome.storage.local with running cumulative sums of tokens, carbon, and water across all sessions.
4. THE Extension SHALL maintain a `per_platform` object in chrome.storage.local keyed by Platform_ID with per-platform cumulative totals.

---

### Requirement 17: Extension Popup — Session Summary Tab

**User Story:** As a user, I want to open the extension popup and see a summary of my current session, so that I can quickly check my usage totals.

#### Acceptance Criteria

1. WHEN the user opens the Popup, THE Popup SHALL display Tab 1 ("Session summary") showing: total tokens, total Carbon_Estimate, total Water_Estimate, and Grade distribution counts.
2. THE Popup SHALL display an "Open dashboard" button on Tab 1 that opens `http://localhost:3000` in a new tab.

---

### Requirement 18: Extension Popup — Last Prompt Tab

**User Story:** As a user, I want to see a breakdown of my most recent prompt in the popup, so that I can review its analysis without reopening the overlay.

#### Acceptance Criteria

1. WHEN the user opens Tab 2 ("Last prompt") in the Popup, THE Popup SHALL display: a preview of the prompt text, Grade letter, efficiency score, intent classification, Carbon_Estimate, Water_Estimate, a list of detected issues, and the suggestion string.

---

### Requirement 19: Extension Popup — Settings Tab

**User Story:** As a user, I want to configure the extension from the popup, so that I can manage my API key and toggle features.

#### Acceptance Criteria

1. WHEN the user opens Tab 3 ("Settings") in the Popup, THE Popup SHALL display: a Gemini API key input field, an API key status indicator, toggles for `overlay_enabled`, `rewriter_enabled`, and `show_equivalences`, a "Clear data" button, an "Export JSON" button, and a link to the Dashboard.
2. WHEN the user enters a Gemini API key and saves, THE Extension SHALL store the key in the `settings` object in chrome.storage.local.
3. WHEN the user clicks "Export JSON", THE Extension SHALL trigger a browser download of a JSON file containing all Session data from chrome.storage.local.
4. WHEN the user clicks "Clear data", THE Extension SHALL delete all Session entries and reset all totals in chrome.storage.local.
5. THE Extension SHALL never include the Gemini API key in any source code file committed to the repository.

---

### Requirement 20: Offline Operation

**User Story:** As a user without internet access, I want the extension to function fully, so that I am not dependent on connectivity for environmental tracking.

#### Acceptance Criteria

1. WHILE the device has no internet connection, THE Extension SHALL perform token counting, carbon estimation, water estimation, efficiency scoring, intent classification, and overlay rendering without making any network requests.
2. WHILE the device has no internet connection, THE Rewriter SHALL apply local rule-based rewriting when the user clicks "Optimise prompt".
3. THE Extension SHALL make no external network calls except when the Gemini API key is configured and the user explicitly clicks "Optimise prompt".

---

### Requirement 21: No API Keys in Source Code

**User Story:** As a developer reviewing the repository, I want to confirm no credentials are embedded in source files, so that the project is safe to share publicly.

#### Acceptance Criteria

1. THE Extension source code SHALL contain no hardcoded API keys, tokens, or credentials.
2. THE Dashboard source code SHALL contain no hardcoded API keys, tokens, or credentials.

---

### Requirement 22: Dashboard — Personal Analytics Page

**User Story:** As a user, I want to visit the Dashboard at localhost:3000 and see my personal usage analytics, so that I can track my environmental impact over time.

#### Acceptance Criteria

1. WHEN the Dashboard is opened at `http://localhost:3000`, THE Dashboard SHALL display four stat cards showing: total tokens, total Carbon_Estimate, total Water_Estimate, and total sessions.
2. THE Dashboard SHALL display a line chart showing CO₂e across the last 30 sessions.
3. THE Dashboard SHALL display a bar chart showing Grade distribution.
4. THE Dashboard SHALL display a donut chart showing intent breakdown.
5. THE Dashboard SHALL display a donut chart showing platform breakdown.
6. THE Dashboard SHALL display a session history table that is paginated and sortable by column.
7. WHEN no exported JSON file has been uploaded, THE Dashboard SHALL populate all charts and the session table with built-in Seed_Data.
8. WHEN the user uploads a JSON export file, THE Dashboard SHALL replace Seed_Data with the uploaded session data for all charts and the session table.

---

### Requirement 23: Dashboard — Team View Page

**User Story:** As a team member, I want to visit the team page at localhost:3000/team and see a leaderboard, so that I can compare environmental impact across the team.

#### Acceptance Criteria

1. WHEN the Dashboard is opened at `http://localhost:3000/team`, THE Dashboard SHALL display a leaderboard of 5 hardcoded Seed_Data users ranked by a chosen metric.
2. THE Dashboard SHALL display team-level total tokens, total Carbon_Estimate, and total Water_Estimate on the team page.
3. THE Dashboard SHALL display a bar chart showing tokens per team member.
4. THE Dashboard SHALL display a platform breakdown for the team.
5. THE Dashboard SHALL display at least two insight callout cards highlighting notable team statistics.

---

### Requirement 24: Data Citations and Disclaimers

**User Story:** As a user or reviewer, I want all environmental metrics to be accompanied by citations and disclaimers, so that I understand the basis and limitations of the estimates.

#### Acceptance Criteria

1. THE Overlay SHALL display a disclaimer adjacent to all environmental metric values stating that figures are estimates.
2. THE Dashboard SHALL display a disclaimer adjacent to all environmental metric values stating that figures are estimates.
3. THE README SHALL include all three data citations: Luccioni et al. (2023) arXiv:2311.16863, Li et al. (2023) arXiv:2304.03271, and IEA World Energy Outlook 2023 (475 g CO₂/kWh).

---

### Requirement 25: Build and Installation

**User Story:** As a developer, I want to set up the entire project with a single command, so that I can get started quickly.

#### Acceptance Criteria

1. THE repository SHALL include a `Makefile` with an `all` target that installs all dependencies and builds the extension and Dashboard without errors.
2. WHEN `make all` is executed in a clean environment, THE build process SHALL complete without errors.
3. THE README SHALL document the three manual setup steps: (1) optional Gemini API key, (2) loading the unpacked extension from the `dist` folder in Chrome, (3) running the Dashboard with `cd trace-dashboard && npm install && npm run dev`.
4. THE README SHALL include sections for: title, description, how it works, data methodology with citations, installation, load extension steps, optional Gemini key setup, team section, and hackathon context.

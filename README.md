# Trace AI Layer

A Chrome extension that measures and reduces the environmental cost of your AI prompt usage — plus a local Next.js dashboard for personal and team analytics.

Built for the [AWS Hackathon for Good](https://amazonwebservices.devpost.com/) 🌍

---

## What It Does

Trace AI Layer intercepts prompts on major AI chat platforms and runs a fully client-side analysis pipeline that estimates carbon emissions, water consumption, and prompt efficiency — all before you hit send.

**Supported platforms:** ChatGPT · Claude · Gemini · Perplexity · Mistral · Copilot

**Key features:**

- Token counting (js-tiktoken, cl100k_base encoding)
- Carbon and water footprint estimation per prompt
- Efficiency scoring with A–F letter grades
- Intent classification (coding, writing, research, exploratory, general)
- Prompt rewriting — local rule-based engine + optional Gemini API
- Inline overlay badge on every supported platform
- Session storage in chrome.storage.local with JSON export
- Personal analytics dashboard with charts and session history
- Team leaderboard with seed data

The extension works entirely offline. The only optional network call is to the Gemini API when you configure a key and explicitly click "Optimise prompt".

---

## How It Works

```
User types in AI chat platform
        │
        ▼
Content Script detects platform → loads Adapter
        │
        ▼
Adapter extracts prompt text (800ms debounce)
        │
        ▼
Analysis Pipeline (all client-side)
  ├── Token counting
  ├── Carbon estimation
  ├── Water estimation
  ├── Equivalence conversions
  ├── Efficiency scoring (A–F)
  └── Intent classification
        │
        ▼
Overlay badge renders below textarea
  ├── Metrics, grade, suggestions
  ├── "Optimise prompt" → Rewriter
  └── "Dismiss" → saves session locally
```

Each platform has a dedicated adapter that handles DOM interaction (selector fallbacks, SPA navigation, text injection). The core pipeline never touches the DOM — it receives plain text and returns a result object.

---

## Data Methodology

All environmental estimates are derived from peer-reviewed research and public data. **These figures are estimates, not exact measurements.**

| Metric | Source | Detail |
|---|---|---|
| Energy per model | Luccioni, A. S., et al. (2023). "Power Hungry Processing: Watts Driving the Cost of AI Deployment?" *arXiv:2311.16863* | Wh per 1,000 tokens by model family |
| Water consumption | Li, P., et al. (2023). "Making AI Less Thirsty." *arXiv:2304.03271* | 0.0106 mL per token |
| Grid carbon intensity | IEA World Energy Outlook 2023 | 475 g CO₂/kWh (global average) |

**Carbon formula:**
```
energy_wh = (tokens / 1000) × model_wh_per_1000_tokens
carbon_mg = (energy_wh / 1000) × 475 × 1,000,000
```

**Water formula:**
```
water_ml = tokens × 0.0106
```

---

## Installation

### Prerequisites

- Node.js 18+
- Google Chrome (or Chromium-based browser)

### Build

```bash
make all
```

This runs `npm install` for the extension, bundles it with webpack into `dist/`, and installs dashboard dependencies.

---

## Setup

Three manual steps to get running:

### 1. Load the extension in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the `dist/` folder from this repository

### 2. (Optional) Configure a Gemini API key

If you want AI-powered prompt rewriting:

1. Get a free API key from [aistudio.google.com](https://aistudio.google.com/)
2. Click the Trace AI Layer extension icon in Chrome
3. Go to the **Settings** tab
4. Paste your key into the Gemini API key field

Without a key, the "Optimise prompt" button uses the built-in local rule-based rewriter. Everything else works fully offline.

### 3. Run the dashboard

```bash
cd trace-dashboard && npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for personal analytics, or [http://localhost:3000/team](http://localhost:3000/team) for the team leaderboard.

The dashboard loads built-in seed data by default. To view your own data, export a JSON file from the extension popup (Settings → Export JSON) and upload it on the dashboard.

---

## Project Structure

```
├── manifest.json          # Chrome MV3 manifest
├── src/
│   ├── adapters/          # Per-platform DOM adapters
│   ├── pipeline/          # Token counting, carbon/water, scoring, classification
│   ├── rewriter/          # Gemini API + local rule-based rewriter
│   ├── overlay/           # Inline badge UI
│   ├── popup/             # Extension popup (3 tabs)
│   ├── content.js         # Entry point: platform detection
│   ├── background.js      # Service worker
│   └── storage.js         # chrome.storage.local helpers
├── trace-dashboard/       # Next.js 14 dashboard (TypeScript, Tailwind, Recharts)
│   ├── app/               # App Router pages
│   ├── components/        # Chart and UI components
│   └── lib/               # Seed data and utilities
├── Makefile               # Build orchestration
└── README.md
```

---

## Team

| Name | Role |
|---|---|
| Trace AI Layer Team | Design, development, and testing |

---

## Hackathon Context

Trace AI Layer was built for the **AWS Hackathon for Good**. The goal: make the environmental cost of AI usage visible and actionable — one prompt at a time.

Every AI query consumes energy and water. Most users have no idea how much. This project puts that information directly in the workflow, right where prompts are written, so people can make informed choices about how they use AI tools.

---

## License

MIT

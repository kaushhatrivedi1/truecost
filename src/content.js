// content.js — Trace AI Layer content script
// Injected into supported AI platform pages.
// Responsible for platform detection, adapter loading, and wiring the analysis pipeline.

import * as pipeline from './pipeline/pipeline.js';
import * as overlay from './overlay/overlay.js';
import * as chatgptAdapter from './adapters/chatgpt.js';
import * as claudeAdapter from './adapters/claude.js';
import * as geminiAdapter from './adapters/gemini.js';
import * as perplexityAdapter from './adapters/perplexity.js';
import * as mistralAdapter from './adapters/mistral.js';
import * as copilotAdapter from './adapters/copilot.js';

/**
 * Map hostnames to platform IDs.
 */
const HOSTNAME_MAP = {
  'chat.openai.com':       'chatgpt',
  'chatgpt.com':           'chatgpt',
  'claude.ai':             'claude',
  'gemini.google.com':     'gemini',
  'perplexity.ai':         'perplexity',
  'chat.mistral.ai':       'mistral',
  'copilot.microsoft.com': 'copilot',
};

/**
 * Map platform IDs to their pre-imported adapter modules.
 */
const ADAPTER_MAP = {
  chatgpt:    chatgptAdapter,
  claude:     claudeAdapter,
  gemini:     geminiAdapter,
  perplexity: perplexityAdapter,
  mistral:    mistralAdapter,
  copilot:    copilotAdapter,
};

/**
 * Detect the current platform from the page hostname.
 * @returns {string|null} Platform ID or null if unsupported.
 */
function detectPlatform() {
  const hostname = location.hostname;
  return HOSTNAME_MAP[hostname] ?? null;
}

/**
 * Text-change callback wired to the adapter's debounced input event.
 * Runs the analysis pipeline and renders the overlay.
 * @param {string} promptText
 * @param {object} adapter
 */
async function onTextChange(promptText, adapter) {
  try {
    const modelId = (adapter && typeof adapter.getModelId === 'function')
      ? (adapter.getModelId() || 'default')
      : 'default';

    const result = await pipeline.analyse(promptText, modelId);

    // Check overlay_enabled setting before rendering
    const storageData = await new Promise((resolve) => {
      chrome.storage.local.get(['settings'], (data) => resolve(data));
    });

    const settings = storageData.settings || {};
    const overlayEnabled = settings.overlay_enabled !== false; // default true

    if (!overlayEnabled) return;

    overlay.renderOverlay(result, adapter);
  } catch (err) {
    console.error('[Trace] Error in onTextChange:', err);
  }
}

/**
 * Main entry point — detect platform, load adapter, wire callback.
 */
async function main() {
  try {
    const platformId = detectPlatform();

    if (!platformId) {
      console.warn('[Trace] Unsupported platform:', location.hostname);
      return;
    }

    const adapter = ADAPTER_MAP[platformId];

    // Wire the text-change callback and initialise the adapter
    adapter.init((promptText) => onTextChange(promptText, adapter));
  } catch (err) {
    console.error('[Trace] Initialisation error:', err);
  }
}

main();

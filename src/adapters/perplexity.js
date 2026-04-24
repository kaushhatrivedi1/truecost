// perplexity.js — Adapter for perplexity.ai

const SELECTORS = [
  'textarea[placeholder]',
  '[data-testid="search-input"]',
  'textarea',
];

const DEBOUNCE_MS = 800;

let element = null;
let debounceTimer = null;
let observer = null;
let isInitialising = false;
let lastHref = '';
let onChangeCallback = null;

/**
 * Find the textarea using selector fallbacks.
 * @returns {Element|null}
 */
function findElement() {
  for (const selector of SELECTORS) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

/**
 * Handle input events with debounce.
 */
function handleInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (onChangeCallback && element) {
      onChangeCallback(getText());
    }
  }, DEBOUNCE_MS);
}

/**
 * Initialise the adapter: find the textarea, attach listeners, start SPA observer.
 * @param {Function} [changeCallback] - Called with prompt text after debounce.
 */
function init(changeCallback) {
  if (isInitialising) return;
  isInitialising = true;

  onChangeCallback = changeCallback || null;

  element = findElement();

  if (!element) {
    console.warn('[Trace] Could not locate textarea on perplexity');
    isInitialising = false;
    return;
  }

  element.addEventListener('input', handleInput);

  // SPA detection via MutationObserver
  lastHref = location.href;
  observer = new MutationObserver(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      teardown();
      // Re-init after a short delay to allow the new page to render
      setTimeout(() => init(onChangeCallback), 300);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  isInitialising = false;
}

/**
 * Remove all listeners and disconnect the observer.
 */
function teardown() {
  if (element) {
    element.removeEventListener('input', handleInput);
    element = null;
  }
  clearTimeout(debounceTimer);
  debounceTimer = null;
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  isInitialising = false;
}

/**
 * Get the current prompt text.
 * @returns {string}
 */
function getText() {
  return element ? element.value : '';
}

/**
 * Set text in the textarea and dispatch React-compatible events.
 * @param {string} text
 */
function setText(text) {
  if (!element) return;
  element.value = text;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Read the active model from the Perplexity UI.
 * @returns {string}
 */
function getModelId() {
  // Try model selector button
  const modelBtn = document.querySelector('[data-testid="model-selector"]');
  if (modelBtn) {
    const text = modelBtn.textContent.trim().toLowerCase();
    if (text) return text;
  }
  // Try any visible model label
  const modelLabel = document.querySelector('.model-label, [class*="model"]');
  if (modelLabel) {
    const text = modelLabel.textContent.trim().toLowerCase();
    if (text) return text;
  }
  return 'default';
}

export { init, teardown, getText, setText, getModelId };

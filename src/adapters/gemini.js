// gemini.js — Adapter for gemini.google.com

const SELECTORS = [
  'rich-textarea textarea',
  '[data-test-id="input-area"] textarea',
];

const DEBOUNCE_MS = 800;

let element = null;
let debounceTimer = null;
let observer = null;
let isInitialising = false;
let lastHref = '';
let onChangeCallback = null;

/**
 * Recursively search for a CSS selector through shadow DOM roots.
 * @param {Element|Document|ShadowRoot} root - The root to search from.
 * @param {string} selector - CSS selector to find.
 * @returns {Element|null}
 */
function queryShadowRoot(root, selector) {
  // Try direct query first
  const direct = root.querySelector(selector);
  if (direct) return direct;

  // Walk all elements and recurse into shadow roots
  const all = root.querySelectorAll('*');
  for (const el of all) {
    if (el.shadowRoot) {
      const found = queryShadowRoot(el.shadowRoot, selector);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Find the textarea using selector fallbacks, including shadow DOM traversal.
 * @returns {Element|null}
 */
function findElement() {
  for (const selector of SELECTORS) {
    const el = queryShadowRoot(document, selector);
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
    console.warn('[Trace] Could not locate textarea on gemini');
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
 * Set text in the textarea and dispatch DOM events.
 * @param {string} text
 */
function setText(text) {
  if (!element) return;
  element.value = text;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Read the active model from the Gemini UI.
 * @returns {string}
 */
function getModelId() {
  // Try common model selector patterns on gemini.google.com
  const modelSelector = document.querySelector('[data-test-id="model-selector"]');
  if (modelSelector) {
    const text = modelSelector.textContent.trim().toLowerCase();
    if (text) return text;
  }
  const modelBtn = document.querySelector('model-selector-button, .model-selector');
  if (modelBtn) {
    const text = modelBtn.textContent.trim().toLowerCase();
    if (text) return text;
  }
  return 'default';
}

export { init, teardown, getText, setText, getModelId, queryShadowRoot };

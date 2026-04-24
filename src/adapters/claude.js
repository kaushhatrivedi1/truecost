// claude.js — Adapter for claude.ai

const SELECTORS = [
  '.ProseMirror',
  '[contenteditable="true"]',
  'div[data-placeholder]',
];

const DEBOUNCE_MS = 800;

let element = null;
let debounceTimer = null;
let observer = null;
let isInitialising = false;
let lastHref = '';
let onChangeCallback = null;

/**
 * Find the editor element using selector fallbacks.
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
 * Initialise the adapter: find the editor, attach listeners, start SPA observer.
 * @param {Function} [changeCallback] - Called with prompt text after debounce.
 */
function init(changeCallback) {
  if (isInitialising) return;
  isInitialising = true;

  onChangeCallback = changeCallback || null;

  element = findElement();

  if (!element) {
    console.warn('[Trace] Could not locate textarea on claude');
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
 * Get the current prompt text from the ProseMirror editor.
 * @returns {string}
 */
function getText() {
  return element ? element.innerText : '';
}

/**
 * Set text in the ProseMirror editor using execCommand so the platform
 * registers the change through its internal mutation detection.
 * @param {string} text
 */
function setText(text) {
  if (!element) return;
  element.focus();
  document.execCommand('selectAll');
  document.execCommand('insertText', false, text);
}

/**
 * Read the active model from the Claude UI.
 * @returns {string}
 */
function getModelId() {
  // Try common model selector patterns on claude.ai
  const modelSelector = document.querySelector('[data-testid="model-selector"]');
  if (modelSelector) {
    const text = modelSelector.textContent.trim().toLowerCase();
    if (text) return text;
  }
  const modelBtn = document.querySelector('button[aria-label*="model" i]');
  if (modelBtn) {
    const label = modelBtn.getAttribute('aria-label') || modelBtn.textContent.trim();
    if (label) return label.toLowerCase();
  }
  return 'default';
}

export { init, teardown, getText, setText, getModelId };

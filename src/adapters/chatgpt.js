// chatgpt.js — Adapter for chat.openai.com and chatgpt.com

const SELECTORS = [
  '#prompt-textarea',
  'textarea[data-id]',
  'form textarea',
  'textarea[placeholder]',
];

const DEBOUNCE_MS = 800;

let element = null;
let debounceTimer = null;
let observer = null;
let onChangeCallback = null;
let lastHref = '';

function findElement() {
  for (const selector of SELECTORS) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

function handleInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (onChangeCallback && element) {
      const text = getText();
      if (text.trim().length > 0) onChangeCallback(text);
    }
  }, DEBOUNCE_MS);
}

function tryAttach() {
  const found = findElement();
  if (found && found !== element) {
    if (element) element.removeEventListener('input', handleInput);
    element = found;
    element.addEventListener('input', handleInput);
  }
}

function init(changeCallback) {
  onChangeCallback = changeCallback || null;
  lastHref = location.href;

  tryAttach();

  observer = new MutationObserver(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      if (element) { element.removeEventListener('input', handleInput); element = null; }
      setTimeout(tryAttach, 500);
    } else if (!element) {
      tryAttach();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function teardown() {
  if (element) { element.removeEventListener('input', handleInput); element = null; }
  clearTimeout(debounceTimer);
  if (observer) { observer.disconnect(); observer = null; }
}

function getText() {
  return element ? (element.value || element.innerText || '') : '';
}

function setText(text) {
  if (!element) return;
  // Use native setter so React picks up the change
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  if (nativeSetter) nativeSetter.call(element, text);
  else element.value = text;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function getModelId() {
  const btn = document.querySelector('[data-testid="model-switcher-dropdown-button"]');
  if (btn) {
    const label = (btn.getAttribute('aria-label') || btn.textContent || '').toLowerCase();
    if (label.includes('mini')) return 'gpt-4o-mini';
    if (label.includes('gpt-4o')) return 'gpt-4o';
  }
  return 'default';
}

function getElement() { return element; }

export { init, teardown, getText, setText, getModelId, getElement };

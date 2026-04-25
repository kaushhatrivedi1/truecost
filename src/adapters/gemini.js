// gemini.js — Adapter for gemini.google.com

const SELECTORS = [
  'rich-textarea .ql-editor',
  'rich-textarea textarea',
  '[data-test-id="input-area"] textarea',
  '.ql-editor[contenteditable="true"]',
  'textarea[placeholder]',
];

const DEBOUNCE_MS = 800;

let element = null;
let debounceTimer = null;
let observer = null;
let onChangeCallback = null;
let lastHref = '';

function queryShadowRoot(root, selector) {
  const direct = root.querySelector(selector);
  if (direct) return direct;
  const all = root.querySelectorAll('*');
  for (const el of all) {
    if (el.shadowRoot) {
      const found = queryShadowRoot(el.shadowRoot, selector);
      if (found) return found;
    }
  }
  return null;
}

function findElement() {
  for (const selector of SELECTORS) {
    const el = queryShadowRoot(document, selector);
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
  if (!element) return '';
  return element.value || element.innerText || element.textContent || '';
}

function setText(text) {
  if (!element) return;
  if (element.value !== undefined) {
    element.value = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    element.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
  }
}

function getModelId() {
  const el = document.querySelector('[data-test-id="model-selector"], model-selector-button, .model-selector');
  if (el) {
    const text = (el.textContent || '').toLowerCase();
    if (text.includes('flash')) return 'gemini-1.5-flash';
    if (text.includes('pro')) return 'gemini-1.5-pro';
  }
  return 'gemini-2.0';
}

function getElement() { return element; }

export { init, teardown, getText, setText, getModelId, getElement, queryShadowRoot };

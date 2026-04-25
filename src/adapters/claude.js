// claude.js — Adapter for claude.ai

const SELECTORS = [
  '.ProseMirror',
  '[contenteditable="true"][data-placeholder]',
  '[contenteditable="true"]',
  'div[data-placeholder]',
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
  return element ? (element.innerText || element.textContent || '') : '';
}

function setText(text) {
  if (!element) return;
  element.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, text);
}

function getModelId() {
  const selectors = [
    '[data-testid="model-selector"]',
    'button[aria-label*="model" i]',
    '.model-selector',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const text = (el.getAttribute('aria-label') || el.textContent || '').toLowerCase();
      if (text.includes('haiku')) return 'claude-3-haiku';
      if (text.includes('sonnet')) return 'claude-3-5-sonnet';
      if (text.includes('opus')) return 'claude-3-opus';
    }
  }
  return 'claude-3-5-sonnet';
}

function getElement() { return element; }

export { init, teardown, getText, setText, getModelId, getElement };

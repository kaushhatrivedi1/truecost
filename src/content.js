// content.js — Trace AI Layer content script

import { optimizePrompt } from './optimizer/optimizer.js';
import { renderOverlay, removePanel } from './overlay/overlay.js';

const PLATFORM_SELECTORS = {
  'chat.openai.com': ['#prompt-textarea', 'textarea[placeholder]', 'div[contenteditable="true"]'],
  'chatgpt.com': ['#prompt-textarea', 'textarea[placeholder]', 'div[contenteditable="true"]'],
  'claude.ai': ['.ProseMirror', 'div[contenteditable="true"]'],
  'gemini.google.com': ['.ql-editor', 'rich-textarea textarea', 'textarea'],
  'perplexity.ai': ['textarea[placeholder]', 'div[contenteditable="true"]'],
  'chat.mistral.ai': ['textarea', 'div[contenteditable="true"]'],
  'copilot.microsoft.com': ['textarea', 'div[contenteditable="true"]'],
};

const MIN_PROMPT_LENGTH = 6;
const ANALYSE_DEBOUNCE_MS = 700;

let textareaEl = null;
let debounceTimer = null;
let currentText = '';
let dismissedForText = '';

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

function findTextarea() {
  const selectors = PLATFORM_SELECTORS[location.hostname] || ['textarea', 'div[contenteditable="true"]'];
  for (const selector of selectors) {
    const el = queryShadowRoot(document, selector);
    if (el) return el;
  }
  return null;
}

function getText(el) {
  if (!el) return '';
  return el.value || el.innerText || el.textContent || '';
}

function setText(el, text) {
  if (!el) return;

  el.focus();
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    if (nativeSetter) nativeSetter.call(el, text);
    else el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, text);
}

function getModelId() {
  const host = location.hostname;

  if (host === 'chat.openai.com' || host === 'chatgpt.com') {
    const btn = document.querySelector('[data-testid="model-switcher-dropdown-button"]');
    const label = (btn?.getAttribute('aria-label') || btn?.textContent || '').toLowerCase();
    if (label.includes('mini')) return 'gpt-4o-mini';
    if (label.includes('gpt-4o')) return 'gpt-4o';
    return 'default';
  }

  if (host === 'gemini.google.com') {
    const el = document.querySelector('[data-test-id="model-selector"], model-selector-button, .model-selector');
    const label = (el?.textContent || '').toLowerCase();
    if (label.includes('flash')) return 'gemini-1.5-flash';
    if (label.includes('pro')) return 'gemini-1.5-pro';
    return 'gemini-2.0';
  }

  return 'default';
}

async function analyseAndRender(text) {
  const trimmed = text.trim();

  if (trimmed.length < MIN_PROMPT_LENGTH) {
    currentText = trimmed;
    dismissedForText = '';
    removePanel();
    return;
  }

  currentText = trimmed;
  chrome.storage.local.set({ currentPrompt: trimmed });

  if (dismissedForText === trimmed) return;

  const data = await chrome.storage.local.get(['settings']).catch(() => ({}));
  const apiKey = data.settings?.gemini_api_key || '';
  const result = await optimizePrompt(trimmed, getModelId(), apiKey);
  await renderOverlay(
    result,
    { setText: (nextText) => setText(textareaEl, nextText) },
    trimmed,
    () => {
      dismissedForText = currentText;
    }
  );
}

function onInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const text = getText(textareaEl);
    if (text.trim() !== dismissedForText) dismissedForText = '';
    analyseAndRender(text).catch(() => {});
  }, ANALYSE_DEBOUNCE_MS);
}

function attachTextarea(found) {
  if (textareaEl) textareaEl.removeEventListener('input', onInput);
  textareaEl = found;
  textareaEl.addEventListener('input', onInput);

  const initialText = getText(textareaEl);
  if (initialText.trim().length >= MIN_PROMPT_LENGTH) {
    analyseAndRender(initialText).catch(() => {});
  }
}

setInterval(() => {
  if (!textareaEl || !document.body.contains(textareaEl)) {
    const found = findTextarea();
    if (found && found !== textareaEl) attachTextarea(found);
  }
}, 1000);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_PROMPT') {
    const text = getText(textareaEl) || currentText || '';
    sendResponse({ text });
    return true;
  }

  if (message.type === 'REPLACE_PROMPT') {
    setText(textareaEl, message.text);
    dismissedForText = '';
    analyseAndRender(message.text).catch(() => {});
    sendResponse({ ok: true });
    return true;
  }
});

// content.js — Trace AI Layer content script

const PLATFORM_SELECTORS = {
  'chat.openai.com':       ['#prompt-textarea', 'textarea[placeholder]', 'div[contenteditable="true"]'],
  'chatgpt.com':           ['#prompt-textarea', 'textarea[placeholder]', 'div[contenteditable="true"]'],
  'claude.ai':             ['.ProseMirror', 'div[contenteditable="true"]'],
  'gemini.google.com':     ['.ql-editor', 'rich-textarea textarea', 'textarea'],
  'perplexity.ai':         ['textarea[placeholder]', 'div[contenteditable="true"]'],
  'chat.mistral.ai':       ['textarea', 'div[contenteditable="true"]'],
  'copilot.microsoft.com': ['textarea', 'div[contenteditable="true"]'],
};

let textareaEl = null;
let debounceTimer = null;
let currentText = '';

function findTextarea() {
  const selectors = PLATFORM_SELECTORS[location.hostname] || ['textarea', 'div[contenteditable="true"]'];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
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
  } else {
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
  }
}

function onInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const text = getText(textareaEl);
    if (text.trim().length > 5) {
      currentText = text;
      chrome.storage.local.set({ currentPrompt: text });
    }
  }, 600);
}

// Poll for textarea every second
setInterval(() => {
  if (!textareaEl || !document.body.contains(textareaEl)) {
    const found = findTextarea();
    if (found && found !== textareaEl) {
      if (textareaEl) textareaEl.removeEventListener('input', onInput);
      textareaEl = found;
      textareaEl.addEventListener('input', onInput);
    }
  }
}, 1000);

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_PROMPT') {
    const text = getText(textareaEl) || currentText || '';
    sendResponse({ text });
    return true;
  }
  if (message.type === 'REPLACE_PROMPT') {
    setText(textareaEl, message.text);
    sendResponse({ ok: true });
    return true;
  }
});

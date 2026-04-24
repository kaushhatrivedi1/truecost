// background.js — Trace AI Layer service worker
// Handles privileged operations: storage management, message routing.

import { saveSession } from './storage.js';

// Message listener for content scripts and popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SAVE_SESSION') {
    saveSession(message.session)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // keep message channel open for async response
  }

  if (message.type === 'GET_STORAGE') {
    chrome.storage.local.get(message.keys ?? null)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === 'CLEAR_STORAGE') {
    chrome.storage.local.clear()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});

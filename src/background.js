// background.js — Trace AI Layer service worker
// Handles privileged operations: storage management, message routing.

import { saveSession, updateTotals, updatePerPlatform } from './storage.js';

// Re-export storage helpers so they can be imported by tests
export { saveSession, updateTotals, updatePerPlatform };

/**
 * Handles incoming messages from content scripts and popup.
 * Routes each message type to the corresponding storage helper.
 *
 * @param {Object} message - The message object with a `type` field.
 * @param {Object} _sender - The sender info (unused).
 * @param {Function} sendResponse - Callback to send a response.
 * @returns {boolean|undefined} Returns true for async responses.
 */
export function handleMessage(message, _sender, sendResponse) {
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
}

// Register the message listener
chrome.runtime.onMessage.addListener(handleMessage);

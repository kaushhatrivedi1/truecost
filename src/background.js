// background.js — Trace AI Layer service worker
// Handles privileged operations: storage management, message routing.

import { saveSession, updateTotals, updatePerPlatform } from './storage.js';

// Re-export storage helpers so they can be imported by tests
export { saveSession, updateTotals, updatePerPlatform };

const BACKEND_URL = 'http://localhost:3000';

/** Returns the persistent userId, creating one on first run. */
async function getOrCreateUserId() {
  const data = await chrome.storage.local.get('settings');
  const settings = data.settings ?? {};
  if (settings.userId) return settings.userId;

  const userId = crypto.randomUUID();
  settings.userId = userId;
  await chrome.storage.local.set({ settings });
  return userId;
}

/** Posts a session to the dashboard backend. Fails silently if dashboard is not running. */
async function syncToBackend(session) {
  try {
    const userId = await getOrCreateUserId();
    const data = await chrome.storage.local.get('settings');
    const userName = data.settings?.userName ?? 'You';

    await fetch(`${BACKEND_URL}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session, userId, userName }),
    });
  } catch {
    // Dashboard may not be running — ignore
  }
}

/**
 * Handles incoming messages from content scripts and popup.
 * Routes each message type to the corresponding storage helper.
 */
export function handleMessage(message, _sender, sendResponse) {
  if (message.type === 'SAVE_SESSION') {
    saveSession(message.session)
      .then(() => {
        syncToBackend(message.session);
        sendResponse({ ok: true });
      })
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
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

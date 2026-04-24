/**
 * storage.js — Session storage helpers for the Trace AI Layer extension.
 *
 * Provides saveSession, updateTotals, and updatePerPlatform.
 * All chrome.storage.local reads use nullish coalescing defaults for
 * corrupt/missing data resilience.
 */

/**
 * Saves a session entry to chrome.storage.local.
 * Enforces a 500-entry FIFO cap on the sessions array.
 * Updates cumulative totals and per-platform totals atomically.
 *
 * @param {Object} session - The session object to save.
 * @returns {Promise<void>}
 */
export async function saveSession(session) {
  const data = await chrome.storage.local.get(['sessions', 'totals', 'per_platform']);

  let sessions = data.sessions ?? [];
  const totals = data.totals ?? {};
  const per_platform = data.per_platform ?? {};

  // Enforce 500-entry FIFO cap
  if (sessions.length >= 500) {
    sessions.shift();
  }

  sessions.push(session);

  updateTotals(totals, session);
  updatePerPlatform(per_platform, session);

  await chrome.storage.local.set({ sessions, totals, per_platform });
}

/**
 * Increments cumulative totals with values from a session.
 * Mutates and returns the totals object.
 *
 * @param {Object} totals - The current totals object.
 * @param {Object} session - The session to add.
 * @returns {Object} The updated totals object.
 */
export function updateTotals(totals, session) {
  totals.tokens = (totals.tokens ?? 0) + session.tokens;
  totals.carbon_mg = (totals.carbon_mg ?? 0) + session.carbon_mg;
  totals.water_ml = (totals.water_ml ?? 0) + session.water_ml;
  totals.session_count = (totals.session_count ?? 0) + 1;
  return totals;
}

/**
 * Increments per-platform totals with values from a session.
 * Initialises the platform entry if absent.
 * Mutates and returns the perPlatform object.
 *
 * @param {Object} perPlatform - The current per_platform object.
 * @param {Object} session - The session to add.
 * @returns {Object} The updated perPlatform object.
 */
export function updatePerPlatform(perPlatform, session) {
  if (!perPlatform[session.platform_id]) {
    perPlatform[session.platform_id] = {
      tokens: 0,
      carbon_mg: 0,
      water_ml: 0,
      session_count: 0,
    };
  }

  const entry = perPlatform[session.platform_id];
  entry.tokens += session.tokens;
  entry.carbon_mg += session.carbon_mg;
  entry.water_ml += session.water_ml;
  entry.session_count += 1;

  return perPlatform;
}

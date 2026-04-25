/**
 * Unit tests for background.js — service worker message routing.
 *
 * Validates that SAVE_SESSION, GET_STORAGE, and CLEAR_STORAGE messages
 * are routed to the correct storage helpers.
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4
 */

// ---------------------------------------------------------------------------
// In-memory chrome.storage.local mock — must be set BEFORE importing modules
// ---------------------------------------------------------------------------

let _store = {};

const chromeMock = {
  storage: {
    local: {
      get: jest.fn(async (keys) => {
        if (keys === null || keys === undefined) return { ..._store };
        if (Array.isArray(keys)) {
          return keys.reduce((acc, k) => {
            if (k in _store) acc[k] = _store[k];
            return acc;
          }, {});
        }
        if (typeof keys === 'string') {
          return keys in _store ? { [keys]: _store[keys] } : {};
        }
        return {};
      }),
      set: jest.fn(async (obj) => {
        Object.assign(_store, obj);
      }),
      clear: jest.fn(async () => {
        _store = {};
      }),
    },
  },
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
  },
};

global.chrome = chromeMock;

// Now import — the module-level addListener call will find chrome defined
const { handleMessage, saveSession, updateTotals, updatePerPlatform } = require('../background.js');

beforeEach(() => {
  _store = {};
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// SAVE_SESSION routing
// ---------------------------------------------------------------------------

describe('SAVE_SESSION message', () => {
  it('saves a session and responds with { ok: true }', async () => {
    const session = {
      id: 'test-id',
      timestamp: new Date().toISOString(),
      platform_id: 'chatgpt',
      model_id: 'gpt-4o',
      tokens: 100,
      carbon_mg: 5.0,
      water_ml: 1.06,
      score: 85,
      grade: 'B',
      intent: 'coding',
      prompt_preview: 'Write a function',
    };

    const sendResponse = jest.fn();
    const result = handleMessage({ type: 'SAVE_SESSION', session }, {}, sendResponse);

    expect(result).toBe(true);

    // Wait for the async operation to complete
    await new Promise((r) => setTimeout(r, 50));

    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
    expect(_store.sessions).toBeDefined();
    expect(_store.sessions.length).toBe(1);
    expect(_store.sessions[0].platform_id).toBe('chatgpt');
  });

  it('responds with { ok: false } when saveSession throws', async () => {
    chromeMock.storage.local.get.mockRejectedValueOnce(new Error('storage error'));

    const sendResponse = jest.fn();
    handleMessage(
      { type: 'SAVE_SESSION', session: { platform_id: 'chatgpt' } },
      {},
      sendResponse
    );

    await new Promise((r) => setTimeout(r, 50));

    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, error: expect.any(String) })
    );
  });
});

// ---------------------------------------------------------------------------
// GET_STORAGE routing
// ---------------------------------------------------------------------------

describe('GET_STORAGE message', () => {
  it('retrieves all storage when keys is null', async () => {
    _store = { totals: { tokens: 42 }, sessions: [] };

    const sendResponse = jest.fn();
    const result = handleMessage({ type: 'GET_STORAGE', keys: null }, {}, sendResponse);

    expect(result).toBe(true);

    await new Promise((r) => setTimeout(r, 50));

    expect(sendResponse).toHaveBeenCalledWith({
      ok: true,
      data: expect.objectContaining({ totals: { tokens: 42 } }),
    });
  });

  it('retrieves specific keys from storage', async () => {
    _store = { totals: { tokens: 10 }, sessions: [{ id: '1' }], per_platform: {} };

    const sendResponse = jest.fn();
    handleMessage({ type: 'GET_STORAGE', keys: ['totals'] }, {}, sendResponse);

    await new Promise((r) => setTimeout(r, 50));

    expect(sendResponse).toHaveBeenCalledWith({
      ok: true,
      data: { totals: { tokens: 10 } },
    });
  });

  it('responds with { ok: false } on storage error', async () => {
    chromeMock.storage.local.get.mockRejectedValueOnce(new Error('read error'));

    const sendResponse = jest.fn();
    handleMessage({ type: 'GET_STORAGE', keys: null }, {}, sendResponse);

    await new Promise((r) => setTimeout(r, 50));

    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, error: 'read error' })
    );
  });
});

// ---------------------------------------------------------------------------
// CLEAR_STORAGE routing
// ---------------------------------------------------------------------------

describe('CLEAR_STORAGE message', () => {
  it('clears storage and responds with { ok: true }', async () => {
    _store = { sessions: [{ id: '1' }], totals: { tokens: 100 } };

    const sendResponse = jest.fn();
    const result = handleMessage({ type: 'CLEAR_STORAGE' }, {}, sendResponse);

    expect(result).toBe(true);

    await new Promise((r) => setTimeout(r, 50));

    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
    expect(chromeMock.storage.local.clear).toHaveBeenCalled();
  });

  it('responds with { ok: false } on clear error', async () => {
    chromeMock.storage.local.clear.mockRejectedValueOnce(new Error('clear error'));

    const sendResponse = jest.fn();
    handleMessage({ type: 'CLEAR_STORAGE' }, {}, sendResponse);

    await new Promise((r) => setTimeout(r, 50));

    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, error: 'clear error' })
    );
  });
});

// ---------------------------------------------------------------------------
// Unknown message type
// ---------------------------------------------------------------------------

describe('Unknown message type', () => {
  it('returns undefined for unrecognized message types', () => {
    const sendResponse = jest.fn();
    const result = handleMessage({ type: 'UNKNOWN' }, {}, sendResponse);

    expect(result).toBeUndefined();
    expect(sendResponse).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Listener registration
// ---------------------------------------------------------------------------

describe('Listener registration', () => {
  it('addListener was called during module load', () => {
    // The addListener call happens at module load time, before beforeEach clears mocks.
    // We verify the listener was registered by checking the mock was called at least once
    // during the module's lifecycle. Since clearAllMocks resets call counts, we verify
    // the mock function itself is wired up and the module references it.
    // Re-import to trigger the addListener call again in a fresh context.
    jest.resetModules();
    // Re-set the global mock (resetModules doesn't clear globals)
    global.chrome = chromeMock;
    require('../background.js');
    expect(chromeMock.runtime.onMessage.addListener).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Re-exports from storage.js
// ---------------------------------------------------------------------------

describe('Re-exports from storage.js', () => {
  it('exports saveSession', () => {
    expect(typeof saveSession).toBe('function');
  });

  it('exports updateTotals', () => {
    expect(typeof updateTotals).toBe('function');
  });

  it('exports updatePerPlatform', () => {
    expect(typeof updatePerPlatform).toBe('function');
  });
});

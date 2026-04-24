/**
 * Property-based tests for storage.js
 *
 * Covers Properties 14–17 from the design document.
 *
 * Uses an in-memory mock of chrome.storage.local so tests run in Jest/jsdom
 * without a real browser extension context.
 */

import * as fc from 'fast-check';
import { saveSession, updateTotals, updatePerPlatform } from '../storage.js';

// ---------------------------------------------------------------------------
// In-memory chrome.storage.local mock
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
};

// Install mock globally before any module code runs
global.chrome = chromeMock;

// Reset store and mock call counts before each test
beforeEach(() => {
  _store = {};
  chromeMock.storage.local.get.mockClear();
  chromeMock.storage.local.set.mockClear();
  chromeMock.storage.local.clear.mockClear();
});

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const PLATFORM_IDS = ['chatgpt', 'claude', 'gemini', 'perplexity', 'mistral', 'copilot'];
const GRADES = ['A', 'B', 'C', 'D', 'F'];
const INTENTS = ['coding', 'writing', 'research', 'exploratory', 'general'];

/** Generates a valid session object matching the Session interface. */
const sessionArb = fc.record({
  id: fc.uuid(),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') })
    .map((d) => d.toISOString()),
  platform_id: fc.constantFrom(...PLATFORM_IDS),
  model_id: fc.string({ minLength: 1, maxLength: 30 }),
  tokens: fc.integer({ min: 0, max: 10000 }),
  carbon_mg: fc.float({ min: 0, max: 100000, noNaN: true }),
  water_ml: fc.float({ min: 0, max: 10000, noNaN: true }),
  score: fc.integer({ min: 0, max: 100 }),
  grade: fc.constantFrom(...GRADES),
  intent: fc.constantFrom(...INTENTS),
  prompt_preview: fc.string({ maxLength: 200 }),
});

// ---------------------------------------------------------------------------
// Property 14: Session storage preserves all required fields
// Validates: Requirements 16.1
// ---------------------------------------------------------------------------

describe('Property 14: Session storage preserves all required fields', () => {
  it('writes a session entry containing all required fields matching the input', async () => {
    await fc.assert(
      fc.asyncProperty(sessionArb, async (session) => {
        // Reset store for each iteration
        _store = {};

        await saveSession(session);

        const stored = _store.sessions;
        expect(Array.isArray(stored)).toBe(true);
        expect(stored.length).toBeGreaterThan(0);

        const entry = stored[stored.length - 1];

        // All required fields must be present and match the input session
        expect(entry.timestamp).toBe(session.timestamp);
        expect(entry.platform_id).toBe(session.platform_id);
        expect(entry.model_id).toBe(session.model_id);
        expect(entry.tokens).toBe(session.tokens);
        expect(entry.carbon_mg).toBe(session.carbon_mg);
        expect(entry.water_ml).toBe(session.water_ml);
        expect(entry.score).toBe(session.score);
        expect(entry.grade).toBe(session.grade);
        expect(entry.intent).toBe(session.intent);
        expect(entry.prompt_preview).toBe(session.prompt_preview);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 15: Sessions array never exceeds 500 entries
// Validates: Requirements 16.2
// ---------------------------------------------------------------------------

describe('Property 15: Sessions array never exceeds 500 entries', () => {
  it('caps the sessions array at 500 and retains the most recent entries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(sessionArb, { minLength: 501, maxLength: 600 }),
        async (sessions) => {
          // Reset store for each iteration
          _store = {};

          for (const session of sessions) {
            await saveSession(session);
          }

          const stored = _store.sessions;
          expect(Array.isArray(stored)).toBe(true);
          expect(stored.length).toBe(500);

          // The stored sessions must be the last 500 from the input sequence
          const expected = sessions.slice(sessions.length - 500);
          for (let i = 0; i < 500; i++) {
            expect(stored[i].timestamp).toBe(expected[i].timestamp);
            expect(stored[i].platform_id).toBe(expected[i].platform_id);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 16: Cumulative totals equal the sum of all sessions
// Validates: Requirements 16.3
// ---------------------------------------------------------------------------

describe('Property 16: Cumulative totals equal the sum of all sessions', () => {
  it('totals.tokens, carbon_mg, and water_ml equal the respective sums across all sessions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(sessionArb, { minLength: 1, maxLength: 50 }),
        async (sessions) => {
          // Reset store for each iteration
          _store = {};

          for (const session of sessions) {
            await saveSession(session);
          }

          const totals = _store.totals;
          expect(totals).toBeDefined();

          const expectedTokens = sessions.reduce((sum, s) => sum + s.tokens, 0);
          const expectedCarbon = sessions.reduce((sum, s) => sum + s.carbon_mg, 0);
          const expectedWater = sessions.reduce((sum, s) => sum + s.water_ml, 0);

          expect(totals.tokens).toBeCloseTo(expectedTokens, 5);
          expect(totals.carbon_mg).toBeCloseTo(expectedCarbon, 5);
          expect(totals.water_ml).toBeCloseTo(expectedWater, 5);
          expect(totals.session_count).toBe(sessions.length);
        }
      ),
      { numRuns: 20 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 17: Per-platform totals equal the filtered sum of sessions
// Validates: Requirements 16.4
// ---------------------------------------------------------------------------

describe('Property 17: Per-platform totals equal the filtered sum of sessions', () => {
  it('per_platform[platform_id] totals equal the sum of matching sessions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(sessionArb, { minLength: 1, maxLength: 50 }),
        fc.constantFrom(...PLATFORM_IDS),
        async (sessions, platformId) => {
          // Reset store for each iteration
          _store = {};

          for (const session of sessions) {
            await saveSession(session);
          }

          const perPlatform = _store.per_platform;
          expect(perPlatform).toBeDefined();

          const matching = sessions.filter((s) => s.platform_id === platformId);

          if (matching.length === 0) {
            // Platform may not appear in per_platform if no sessions matched
            expect(perPlatform[platformId]).toBeUndefined();
          } else {
            const entry = perPlatform[platformId];
            expect(entry).toBeDefined();

            const expectedTokens = matching.reduce((sum, s) => sum + s.tokens, 0);
            const expectedCarbon = matching.reduce((sum, s) => sum + s.carbon_mg, 0);
            const expectedWater = matching.reduce((sum, s) => sum + s.water_ml, 0);

            expect(entry.tokens).toBeCloseTo(expectedTokens, 5);
            expect(entry.carbon_mg).toBeCloseTo(expectedCarbon, 5);
            expect(entry.water_ml).toBeCloseTo(expectedWater, 5);
            expect(entry.session_count).toBe(matching.length);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

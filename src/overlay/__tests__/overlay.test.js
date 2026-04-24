/**
 * Tests for src/overlay/overlay.js
 *
 * Feature: trace-ai-layer
 * Properties 11, 12, 13 + unit tests
 */

import fc from 'fast-check';

// ─── Mock chrome APIs ────────────────────────────────────────────────────────

const mockStorageData = {};

global.chrome = {
  storage: {
    local: {
      get: jest.fn(async (keys) => {
        const result = {};
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) {
          if (k in mockStorageData) result[k] = mockStorageData[k];
        }
        return result;
      }),
      set: jest.fn(async () => {}),
    },
  },
  runtime: {
    sendMessage: jest.fn(),
  },
};

// ─── Mock rewriter ────────────────────────────────────────────────────────────

jest.mock('../../rewriter/rewriter.js', () => ({
  rewrite: jest.fn(async (text) => ({
    original: text,
    rewritten: text + ' [rewritten]',
    tokenDelta: -2,
    percentSaved: 10,
    changes: ['Removed filler phrase'],
    source: 'Local',
  })),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { renderOverlay, saveSession, renderRewriteResult } from '../overlay.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resets the DOM and mock storage before each test.
 */
function resetDOM() {
  document.body.innerHTML = '';
  // Remove any existing overlay
  const existing = document.getElementById('trace-overlay');
  if (existing) existing.remove();
}

function resetMockStorage(overrides = {}) {
  Object.keys(mockStorageData).forEach((k) => delete mockStorageData[k]);
  Object.assign(mockStorageData, overrides);
}

/**
 * Creates a minimal valid ResultObject.
 */
function makeResult(overrides = {}) {
  return {
    tokens: 42,
    tokenLabel: 'est.',
    carbon: { mg: 0.05, isEstimate: true },
    water: { ml: 0.45, isEstimate: true },
    equivalences: {
      phoneChargeSeconds: 0.105,
      googleSearches: 0.00025,
      wordsEquivalent: 31.5,
    },
    score: 85,
    grade: 'B',
    gradeColor: 'teal',
    intent: 'coding',
    modelId: 'gpt-4o',
    suggestion: 'Add an output format specification.',
    ...overrides,
  };
}

/**
 * Creates a minimal mock adapter.
 */
function makeAdapter(overrides = {}) {
  return {
    getText: jest.fn(() => 'original prompt text'),
    setText: jest.fn(),
    getElement: jest.fn(() => null),
    ...overrides,
  };
}

// ─── fast-check arbitraries ───────────────────────────────────────────────────

const gradeArb = fc.constantFrom('A', 'B', 'C', 'D', 'F');
const gradeColorArb = fc.constantFrom('green', 'teal', 'amber', 'orange', 'red');
const intentArb = fc.constantFrom('coding', 'writing', 'research', 'exploratory', 'general');

const resultObjectArb = fc.record({
  tokens: fc.integer({ min: 0, max: 10000 }),
  tokenLabel: fc.constant('est.'),
  carbon: fc.record({
    mg: fc.float({ min: 0, max: 1000, noNaN: true }),
    isEstimate: fc.constant(true),
  }),
  water: fc.record({
    ml: fc.float({ min: 0, max: 1000, noNaN: true }),
    isEstimate: fc.constant(true),
  }),
  equivalences: fc.record({
    phoneChargeSeconds: fc.float({ min: 0, max: 10000, noNaN: true }),
    googleSearches: fc.float({ min: 0, max: 100, noNaN: true }),
    wordsEquivalent: fc.float({ min: 0, max: 10000, noNaN: true }),
  }),
  score: fc.integer({ min: 0, max: 100 }),
  grade: gradeArb,
  gradeColor: gradeColorArb,
  intent: intentArb,
  modelId: fc.oneof(
    fc.constant('gpt-4o'),
    fc.constant('claude-3-sonnet'),
    fc.constant('default'),
    fc.string({ minLength: 1, maxLength: 20 })
  ),
  suggestion: fc.string({ minLength: 0, maxLength: 200 }),
});

const rewriteResultArb = fc.record({
  original: fc.string({ minLength: 1, maxLength: 200 }),
  rewritten: fc.string({ minLength: 1, maxLength: 200 }),
  tokenDelta: fc.integer({ min: -100, max: 100 }),
  percentSaved: fc.float({ min: 0, max: 100, noNaN: true }),
  changes: fc.array(fc.string({ minLength: 1, maxLength: 80 }), { minLength: 0, maxLength: 3 }),
  source: fc.constantFrom('Gemini', 'Local'),
});

// ─── Property 11: Overlay renders all required fields ─────────────────────────
// Feature: trace-ai-layer, Property 11: Overlay renders all required fields for any valid result object
// Validates: Requirements 12.2, 24.1

describe('Property 11: Overlay renders all required fields for any valid result object', () => {
  beforeEach(() => {
    resetDOM();
    resetMockStorage({ settings: { overlay_enabled: true, show_equivalences: true } });
    jest.clearAllMocks();
  });

  test('renders all required fields for any valid ResultObject', async () => {
    await fc.assert(
      fc.asyncProperty(resultObjectArb, async (result) => {
        resetDOM();
        const adapter = makeAdapter();
        await renderOverlay(result, adapter);

        const overlay = document.getElementById('trace-overlay');
        expect(overlay).not.toBeNull();

        const html = overlay.innerHTML;

        // Grade letter must be present
        expect(html).toContain(result.grade);

        // Score must be present
        expect(html).toContain(String(result.score));

        // Token count with "est." suffix
        expect(html).toContain(String(result.tokens));
        expect(html).toContain('est.');

        // Carbon value with disclaimer
        expect(html).toMatch(/mg CO₂e \(est\.\)/);

        // Water value with disclaimer
        expect(html).toMatch(/ml \(est\.\)/);

        // Suggestion string (may be empty, but element must exist)
        expect(overlay.querySelector('.trace-suggestion')).not.toBeNull();

        // "Optimise prompt" button
        const optimiseBtn = overlay.querySelector('.trace-btn-optimise');
        expect(optimiseBtn).not.toBeNull();
        expect(optimiseBtn.textContent).toContain('Optimise prompt');

        // "Dismiss" button
        const dismissBtn = overlay.querySelector('.trace-btn-dismiss');
        expect(dismissBtn).not.toBeNull();
        expect(dismissBtn.textContent).toContain('Dismiss');
      }),
      { numRuns: 100 }
    );
  });

  test('renders equivalences section when show_equivalences is true', async () => {
    await fc.assert(
      fc.asyncProperty(resultObjectArb, async (result) => {
        resetDOM();
        resetMockStorage({ settings: { overlay_enabled: true, show_equivalences: true } });
        const adapter = makeAdapter();
        await renderOverlay(result, adapter);

        const overlay = document.getElementById('trace-overlay');
        expect(overlay).not.toBeNull();
        expect(overlay.querySelector('.trace-equivalences')).not.toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 12: Rewrite result display contains all required fields ──────────
// Feature: trace-ai-layer, Property 12: Rewrite result display contains all required fields
// Validates: Requirements 13.5, 14.2

describe('Property 12: Rewrite result display contains all required fields', () => {
  beforeEach(() => {
    resetDOM();
    jest.clearAllMocks();
  });

  test('renders all required fields for any valid RewriteResult', () => {
    fc.assert(
      fc.property(rewriteResultArb, (rewriteResult) => {
        resetDOM();
        document.body.innerHTML = '<div id="trace-overlay"></div>';
        const overlay = document.getElementById('trace-overlay');
        const adapter = makeAdapter();

        renderRewriteResult(overlay, rewriteResult, adapter, rewriteResult.original);

        const panel = overlay.querySelector('.trace-rewrite-panel');
        expect(panel).not.toBeNull();

        const html = panel.innerHTML;

        // Original text must be present
        // (HTML-escaped, so check for the element)
        expect(overlay.querySelector('.trace-rewrite-original')).not.toBeNull();

        // Rewritten text must be present
        expect(overlay.querySelector('.trace-rewrite-rewritten')).not.toBeNull();

        // Token delta
        expect(overlay.querySelector('.trace-token-delta')).not.toBeNull();
        expect(html).toContain('tokens');

        // Percentage saved
        expect(overlay.querySelector('.trace-percent-saved')).not.toBeNull();
        expect(html).toContain('saved');

        // Source label
        expect(overlay.querySelector('.trace-source-label')).not.toBeNull();
        expect(html).toContain(rewriteResult.source);

        // Up to 3 changes
        const changeItems = overlay.querySelectorAll('.trace-change-item');
        expect(changeItems.length).toBeLessThanOrEqual(3);
        expect(changeItems.length).toBe(Math.min(rewriteResult.changes.length, 3));
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 13: Apply-then-undo is a round trip ─────────────────────────────
// Feature: trace-ai-layer, Property 13: Apply-then-undo is a round trip
// Validates: Requirements 15.3

describe('Property 13: Apply-then-undo is a round trip', () => {
  beforeEach(() => {
    resetDOM();
    jest.clearAllMocks();
  });

  test('after applying a rewrite and clicking Undo, adapter receives original text', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        (originalText, rewrittenText) => {
          resetDOM();
          document.body.innerHTML = '<div id="trace-overlay"></div>';
          const overlay = document.getElementById('trace-overlay');

          const setTextCalls = [];
          const adapter = makeAdapter({
            setText: jest.fn((text) => setTextCalls.push(text)),
          });

          const rewriteResult = {
            original: originalText,
            rewritten: rewrittenText,
            tokenDelta: -1,
            percentSaved: 5,
            changes: [],
            source: 'Local',
          };

          renderRewriteResult(overlay, rewriteResult, adapter, originalText);

          const applyBtn = overlay.querySelector('.trace-btn-apply');
          expect(applyBtn).not.toBeNull();

          // Click Apply — should set rewritten text
          applyBtn.click();
          expect(setTextCalls[setTextCalls.length - 1]).toBe(rewrittenText);
          expect(applyBtn.textContent).toBe('Undo');

          // Click Undo — should restore original text
          applyBtn.click();
          expect(setTextCalls[setTextCalls.length - 1]).toBe(originalText);
          expect(applyBtn.textContent).toBe('Apply');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Unit tests for overlay ───────────────────────────────────────────────────

describe('Unit tests: overlay rendering', () => {
  beforeEach(() => {
    resetDOM();
    resetMockStorage({ settings: { overlay_enabled: true, show_equivalences: true } });
    jest.clearAllMocks();
  });

  test('renders overlay with a specific result object', async () => {
    const result = makeResult();
    const adapter = makeAdapter();

    await renderOverlay(result, adapter);

    const overlay = document.getElementById('trace-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay.innerHTML).toContain('B'); // grade
    expect(overlay.innerHTML).toContain('85'); // score
    expect(overlay.innerHTML).toContain('42 est.'); // tokens
    expect(overlay.innerHTML).toContain('gpt-4o'); // platform label
    expect(overlay.innerHTML).toContain('mg CO₂e (est.)');
    expect(overlay.innerHTML).toContain('ml (est.)');
    expect(overlay.innerHTML).toContain('Add an output format specification.');
  });

  test('updates overlay in place without creating a duplicate', async () => {
    const result = makeResult();
    const adapter = makeAdapter();

    await renderOverlay(result, adapter);
    await renderOverlay({ ...result, score: 90, grade: 'A', gradeColor: 'green' }, adapter);

    const overlays = document.querySelectorAll('#trace-overlay');
    expect(overlays.length).toBe(1);
    expect(overlays[0].innerHTML).toContain('90');
    expect(overlays[0].innerHTML).toContain('A');
  });

  test('"Dismiss" button hides overlay and calls saveSession via chrome.runtime.sendMessage', async () => {
    const result = makeResult();
    const adapter = makeAdapter();

    await renderOverlay(result, adapter);

    const overlay = document.getElementById('trace-overlay');
    const dismissBtn = overlay.querySelector('.trace-btn-dismiss');
    expect(dismissBtn).not.toBeNull();

    dismissBtn.click();

    expect(overlay.style.display).toBe('none');
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'SAVE_SESSION',
      payload: result,
    });
  });

  test('overlay_enabled: false prevents rendering', async () => {
    resetMockStorage({ settings: { overlay_enabled: false } });

    const result = makeResult();
    const adapter = makeAdapter();

    await renderOverlay(result, adapter);

    const overlay = document.getElementById('trace-overlay');
    expect(overlay).toBeNull();
  });

  test('show_equivalences: false hides equivalences section', async () => {
    resetMockStorage({ settings: { overlay_enabled: true, show_equivalences: false } });

    const result = makeResult();
    const adapter = makeAdapter();

    await renderOverlay(result, adapter);

    const overlay = document.getElementById('trace-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay.querySelector('.trace-equivalences')).toBeNull();
  });

  test('overlay is appended to document.body when adapter has no element', async () => {
    const result = makeResult();
    const adapter = makeAdapter({ getElement: jest.fn(() => null) });

    await renderOverlay(result, adapter);

    const overlay = document.getElementById('trace-overlay');
    expect(overlay).not.toBeNull();
    expect(document.body.contains(overlay)).toBe(true);
  });

  test('overlay is injected after textarea parent when adapter provides element', async () => {
    // Set up a parent container with a textarea child
    document.body.innerHTML = '<div id="parent"><textarea id="ta"></textarea></div>';
    const textarea = document.getElementById('ta');

    const result = makeResult();
    const adapter = makeAdapter({ getElement: jest.fn(() => textarea) });

    await renderOverlay(result, adapter);

    const overlay = document.getElementById('trace-overlay');
    expect(overlay).not.toBeNull();
    // The overlay should be a sibling of #parent (inserted after it)
    const parent = document.getElementById('parent');
    expect(parent.nextElementSibling).toBe(overlay);
  });
});

// ─── Unit tests: saveSession ──────────────────────────────────────────────────

describe('Unit tests: saveSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sends SAVE_SESSION message with the result payload', () => {
    const result = makeResult();
    saveSession(result);

    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'SAVE_SESSION',
      payload: result,
    });
  });
});

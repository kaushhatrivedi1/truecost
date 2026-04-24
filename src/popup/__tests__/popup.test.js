/**
 * Unit tests for popup.js
 *
 * Covers Requirements 17.1, 18.1, 19.1, 19.3, 19.4
 */

const { renderSummaryTab, renderLastPromptTab, renderSettingsTab, escapeHtml } = require('../popup.js');

// ─── Mock chrome APIs ─────────────────────────────────────────────────────────

let mockStorage = {};

global.chrome = {
  storage: {
    local: {
      get: jest.fn(async (keys) => {
        if (keys === null || keys === undefined) return { ...mockStorage };
        if (Array.isArray(keys)) {
          return keys.reduce((acc, k) => {
            if (k in mockStorage) acc[k] = mockStorage[k];
            return acc;
          }, {});
        }
        if (typeof keys === 'string') {
          return keys in mockStorage ? { [keys]: mockStorage[keys] } : {};
        }
        return {};
      }),
      set: jest.fn(async (obj) => {
        Object.assign(mockStorage, obj);
      }),
      clear: jest.fn(async () => {
        mockStorage = {};
      }),
    },
  },
  tabs: {
    create: jest.fn(),
  },
  downloads: {
    download: jest.fn(),
  },
  runtime: {
    sendMessage: jest.fn(),
  },
};

// ─── Setup DOM ────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockStorage = {};
  document.body.innerHTML = `
    <div id="totals"></div>
    <button id="open-dashboard"></button>
    <div id="last-prompt-content"></div>
    <div id="settings-content"></div>
  `;
  jest.clearAllMocks();
});

// ─── Test 1: Tab 1 renders correct totals and grade distribution ─────────────

describe('Tab 1: Session Summary', () => {
  it('renders correct totals and grade distribution with mock storage data', async () => {
    mockStorage = {
      totals: {
        tokens: 1000,
        carbon_mg: 5.5,
        water_ml: 10.6,
        session_count: 5,
      },
      sessions: [
        { grade: 'A' },
        { grade: 'A' },
        { grade: 'B' },
        { grade: 'C' },
        { grade: 'F' },
      ],
      settings: {},
    };

    await renderSummaryTab();

    const totalsEl = document.getElementById('totals');
    expect(totalsEl).not.toBeNull();

    const html = totalsEl.innerHTML;

    // Check totals are rendered
    expect(html).toContain('1,000');
    expect(html).toContain('5.5000');
    expect(html).toContain('10.6000');
    expect(html).toContain('5'); // session count

    // Check grade distribution
    expect(html).toContain('A: 2');
    expect(html).toContain('B: 1');
    expect(html).toContain('C: 1');
    expect(html).toContain('D: 0');
    expect(html).toContain('F: 1');
  });

  it('handles missing totals gracefully', async () => {
    mockStorage = {};

    await renderSummaryTab();

    const totalsEl = document.getElementById('totals');
    expect(totalsEl).not.toBeNull();

    const html = totalsEl.innerHTML;
    expect(html).toContain('0'); // defaults to 0
  });

  it('"Open dashboard" button calls chrome.tabs.create with correct URL', async () => {
    mockStorage = {
      settings: { dashboard_url: 'http://localhost:3000' },
    };

    await renderSummaryTab();

    const dashBtn = document.getElementById('open-dashboard');
    expect(dashBtn).not.toBeNull();

    dashBtn.click();

    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'http://localhost:3000',
    });
  });

  it('uses default dashboard URL when not set in settings', async () => {
    mockStorage = { settings: {} };

    await renderSummaryTab();

    const dashBtn = document.getElementById('open-dashboard');
    dashBtn.click();

    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'http://localhost:3000',
    });
  });
});

// ─── Test 2: Tab 2 renders last session fields correctly ─────────────────────

describe('Tab 2: Last Prompt', () => {
  it('renders last session fields correctly', async () => {
    mockStorage = {
      sessions: [
        {
          prompt_preview: 'Explain quantum computing',
          grade: 'B',
          score: 85,
          intent: 'research',
          carbon_mg: 0.05,
          water_ml: 0.45,
          suggestion: 'Add an output format specification.',
        },
      ],
    };

    await renderLastPromptTab();

    const contentEl = document.getElementById('last-prompt-content');
    expect(contentEl).not.toBeNull();

    const html = contentEl.innerHTML;

    expect(html).toContain('Explain quantum computing');
    expect(html).toContain('B');
    expect(html).toContain('85');
    expect(html).toContain('research');
    expect(html).toContain('0.0500');
    expect(html).toContain('0.4500');
    expect(html).toContain('Add an output format specification.');
  });

  it('shows "No sessions yet" when sessions array is empty', async () => {
    mockStorage = { sessions: [] };

    await renderLastPromptTab();

    const contentEl = document.getElementById('last-prompt-content');
    expect(contentEl).not.toBeNull();

    const html = contentEl.innerHTML;
    expect(html).toContain('No sessions yet');
  });

  it('renders the most recent session when multiple exist', async () => {
    mockStorage = {
      sessions: [
        { prompt_preview: 'First prompt', grade: 'A', score: 95 },
        { prompt_preview: 'Second prompt', grade: 'C', score: 75 },
        { prompt_preview: 'Third prompt', grade: 'B', score: 88 },
      ],
    };

    await renderLastPromptTab();

    const contentEl = document.getElementById('last-prompt-content');
    const html = contentEl.innerHTML;

    expect(html).toContain('Third prompt');
    expect(html).toContain('B');
    expect(html).toContain('88');
    expect(html).not.toContain('First prompt');
    expect(html).not.toContain('Second prompt');
  });
});

// ─── Test 3: Tab 3 settings save/load/clear operations ───────────────────────

describe('Tab 3: Settings', () => {
  it('loads settings correctly from storage', async () => {
    mockStorage = {
      settings: {
        gemini_api_key: 'test-api-key-123',
        overlay_enabled: true,
        rewriter_enabled: false,
        show_equivalences: true,
      },
    };

    await renderSettingsTab();

    const apiKeyInput = document.getElementById('api-key-input');
    expect(apiKeyInput).not.toBeNull();
    expect(apiKeyInput.value).toBe('test-api-key-123');

    const apiKeyStatus = document.getElementById('api-key-status');
    expect(apiKeyStatus.textContent).toContain('Configured');

    const overlayToggle = document.getElementById('toggle-overlay');
    expect(overlayToggle.checked).toBe(true);

    const rewriterToggle = document.getElementById('toggle-rewriter');
    expect(rewriterToggle.checked).toBe(false);

    const equivalencesToggle = document.getElementById('toggle-equivalences');
    expect(equivalencesToggle.checked).toBe(true);
  });

  it('shows "Not set" status when API key is empty', async () => {
    mockStorage = { settings: {} };

    await renderSettingsTab();

    const apiKeyStatus = document.getElementById('api-key-status');
    expect(apiKeyStatus.textContent).toContain('Not set');
  });

  it('saves API key to storage when input changes', async () => {
    mockStorage = { settings: {} };

    await renderSettingsTab();

    const apiKeyInput = document.getElementById('api-key-input');
    apiKeyInput.value = 'new-api-key';
    apiKeyInput.dispatchEvent(new Event('change'));

    // Wait for async save
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      settings: { gemini_api_key: 'new-api-key' },
    });
  });

  it('saves toggle states to storage when changed', async () => {
    mockStorage = { settings: { overlay_enabled: true } };

    await renderSettingsTab();

    const overlayToggle = document.getElementById('toggle-overlay');
    overlayToggle.checked = false;
    overlayToggle.dispatchEvent(new Event('change'));

    // Wait for async save
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      settings: { overlay_enabled: false },
    });
  });

  it('"Clear data" button calls chrome.storage.local.clear()', async () => {
    mockStorage = { settings: {} };

    await renderSettingsTab();

    const clearBtn = document.getElementById('clear-btn');
    expect(clearBtn).not.toBeNull();

    clearBtn.click();

    // Wait for async clear
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(chrome.storage.local.clear).toHaveBeenCalled();
  });
});

// ─── Test 4: "Export JSON" triggers download with correct data shape ─────────

describe('Export JSON', () => {
  it('triggers chrome.downloads.download with storage data', async () => {
    mockStorage = {
      sessions: [{ id: '1', prompt_preview: 'test' }],
      totals: { tokens: 100 },
      settings: { overlay_enabled: true },
    };

    await renderSettingsTab();

    const exportBtn = document.getElementById('export-btn');
    expect(exportBtn).not.toBeNull();

    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');

    exportBtn.click();

    // Wait for async export
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(chrome.downloads.download).toHaveBeenCalled();
    const call = chrome.downloads.download.mock.calls[0][0];
    expect(call.url).toBe('blob:mock-url');
    expect(call.filename).toMatch(/trace-ai-layer-export-\d+\.json/);
  });
});

// ─── Test 5: escapeHtml helper ───────────────────────────────────────────────

describe('escapeHtml helper', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
    expect(escapeHtml('A & B')).toBe('A &amp; B');
    expect(escapeHtml("It's a test")).toBe('It&#39;s a test');
  });

  it('handles non-string inputs', () => {
    expect(escapeHtml(123)).toBe('123');
    expect(escapeHtml(null)).toBe('null');
    expect(escapeHtml(undefined)).toBe('undefined');
  });
});

// popup.js — Three-tab popup controller for Trace AI Layer

// ─── Tab navigation ───────────────────────────────────────────────────────────

function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      tabBtns.forEach((b) => b.classList.remove('active'));
      tabPanels.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const panel = document.getElementById('tab-' + target);
      if (panel) panel.classList.add('active');
    });
  });
}

// ─── Tab 1: Session Summary ───────────────────────────────────────────────────

async function renderSummaryTab() {
  const data = await chrome.storage.local.get(['totals', 'sessions', 'settings']);
  const totals = data.totals || {};
  const sessions = data.sessions || [];
  const settings = data.settings || {};

  // Grade distribution
  const gradeCounts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  sessions.forEach((s) => {
    if (s.grade && gradeCounts[s.grade] !== undefined) {
      gradeCounts[s.grade]++;
    }
  });

  const totalsEl = document.getElementById('totals');
  if (totalsEl) {
    totalsEl.innerHTML = `
      <div class="metric-row">
        <span class="metric-label">Total Tokens</span>
        <span class="metric-value">${(totals.tokens || 0).toLocaleString()} est.</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Total Carbon</span>
        <span class="metric-value">${(totals.carbon_mg || 0).toFixed(4)} mg CO₂e (est.)</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Total Water</span>
        <span class="metric-value">${(totals.water_ml || 0).toFixed(4)} ml (est.)</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Sessions</span>
        <span class="metric-value">${totals.session_count || 0}</span>
      </div>
      <div class="grade-distribution">
        <div class="grade-dist-title">Grade Distribution</div>
        <div class="grade-dist-row">
          ${Object.entries(gradeCounts)
            .map(([g, c]) => `<span class="grade-badge grade-${g.toLowerCase()}">${g}: ${c}</span>`)
            .join('')}
        </div>
      </div>
    `;
  }

  const dashBtn = document.getElementById('open-dashboard');
  if (dashBtn) {
    dashBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: settings.dashboard_url || 'http://localhost:3000' });
    });
  }
}

// ─── Tab 2: Last Prompt ───────────────────────────────────────────────────────

async function renderLastPromptTab() {
  const data = await chrome.storage.local.get(['sessions']);
  const sessions = data.sessions || [];
  const contentEl = document.getElementById('last-prompt-content');
  if (!contentEl) return;

  if (sessions.length === 0) {
    contentEl.innerHTML = '<p class="empty-state">No sessions yet.</p>';
    return;
  }

  const last = sessions[sessions.length - 1];
  contentEl.innerHTML = `
    <div class="metric-row">
      <span class="metric-label">Prompt Preview</span>
      <span class="metric-value prompt-preview">${escapeHtml(last.prompt_preview || '')}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Grade</span>
      <span class="metric-value grade-badge">${escapeHtml(last.grade || '')}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Score</span>
      <span class="metric-value">${last.score != null ? last.score : '—'}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Intent</span>
      <span class="metric-value">${escapeHtml(last.intent || '')}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Carbon</span>
      <span class="metric-value">${(last.carbon_mg || 0).toFixed(4)} mg CO₂e (est.)</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Water</span>
      <span class="metric-value">${(last.water_ml || 0).toFixed(4)} ml (est.)</span>
    </div>
    ${last.suggestion ? `
    <div class="metric-row suggestion-row">
      <span class="metric-label">Suggestion</span>
      <span class="metric-value">${escapeHtml(last.suggestion)}</span>
    </div>` : ''}
  `;
}

// ─── Tab 3: Settings ──────────────────────────────────────────────────────────

async function renderSettingsTab() {
  const data = await chrome.storage.local.get(['settings']);
  const settings = data.settings || {};

  const contentEl = document.getElementById('settings-content');
  if (!contentEl) return;

  contentEl.innerHTML = `
    <div class="settings-group">
      <label class="settings-label" for="api-key-input">Gemini API Key</label>
      <input type="password" id="api-key-input" class="settings-input"
        placeholder="Enter API key (optional)"
        value="${escapeHtml(settings.gemini_api_key || '')}" />
      <span id="api-key-status" class="api-key-status">
        ${settings.gemini_api_key ? '✓ Configured' : 'Not set'}
      </span>
    </div>

    <div class="settings-group">
      <label class="toggle-label">
        <input type="checkbox" id="toggle-overlay" ${settings.overlay_enabled !== false ? 'checked' : ''} />
        <span>Overlay enabled</span>
      </label>
      <label class="toggle-label">
        <input type="checkbox" id="toggle-rewriter" ${settings.rewriter_enabled !== false ? 'checked' : ''} />
        <span>Rewriter enabled</span>
      </label>
      <label class="toggle-label">
        <input type="checkbox" id="toggle-equivalences" ${settings.show_equivalences !== false ? 'checked' : ''} />
        <span>Show equivalences</span>
      </label>
    </div>

    <div class="settings-group">
      <button id="export-btn" class="settings-btn">Export JSON</button>
      <button id="clear-btn" class="settings-btn settings-btn-danger">Clear data</button>
    </div>

    <div class="settings-group">
      <a href="http://localhost:3000" target="_blank" class="dashboard-link">Open Dashboard ↗</a>
    </div>
  `;

  // Auto-save on API key change
  const apiKeyInput = document.getElementById('api-key-input');
  const apiKeyStatus = document.getElementById('api-key-status');
  if (apiKeyInput) {
    apiKeyInput.addEventListener('change', async () => {
      const current = await chrome.storage.local.get(['settings']);
      const s = current.settings || {};
      s.gemini_api_key = apiKeyInput.value.trim();
      await chrome.storage.local.set({ settings: s });
      if (apiKeyStatus) {
        apiKeyStatus.textContent = s.gemini_api_key ? '✓ Configured' : 'Not set';
      }
    });
  }

  // Auto-save toggles
  ['overlay', 'rewriter', 'equivalences'].forEach((key) => {
    const toggle = document.getElementById(`toggle-${key}`);
    if (!toggle) return;
    const storageKey = key === 'equivalences' ? 'show_equivalences' : `${key}_enabled`;
    toggle.addEventListener('change', async () => {
      const current = await chrome.storage.local.get(['settings']);
      const s = current.settings || {};
      s[storageKey] = toggle.checked;
      await chrome.storage.local.set({ settings: s });
    });
  });

  // Export JSON
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const allData = await chrome.storage.local.get(null);
      const json = JSON.stringify(allData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({
        url,
        filename: `trace-ai-layer-export-${Date.now()}.json`,
      });
    });
  }

  // Clear data
  const clearBtn = document.getElementById('clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      await chrome.storage.local.clear();
      // Re-render to show empty state
      await renderSummaryTab();
      await renderLastPromptTab();
      await renderSettingsTab();
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  initTabs();
  await Promise.all([
    renderSummaryTab(),
    renderLastPromptTab(),
    renderSettingsTab(),
  ]);
}

document.addEventListener('DOMContentLoaded', init);

// Export for testing
if (typeof module !== 'undefined') {
  module.exports = { renderSummaryTab, renderLastPromptTab, renderSettingsTab, escapeHtml };
}

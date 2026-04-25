// overlay.js — Trace AI Layer content script

const PANEL_ID = 'tl-panel';
const FAB_ID = 'tl-fab';
let activeTab = 'optimize';
let lastRenderArgs = null;

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function gradeClass(gradeColor) {
  const map = {
    green: 'tl-grade-green',
    teal: 'tl-grade-teal',
    amber: 'tl-grade-amber',
    orange: 'tl-grade-orange',
    red: 'tl-grade-red',
  };
  return map[gradeColor] || 'tl-grade-green';
}

function removeFab() {
  const existing = document.getElementById(FAB_ID);
  if (existing) existing.remove();
}

function removePanel() {
  const existing = document.getElementById(PANEL_ID);
  if (existing) existing.remove();
}

function showFab() {
  removeFab();
  if (!lastRenderArgs) return;

  const fab = document.createElement('button');
  fab.id = FAB_ID;
  fab.setAttribute('aria-label', 'Open Trace');
  fab.innerHTML = `
    <div class="tl-fab-mark">
      <span class="tl-brand-glyph tl-brand-glyph-top"></span>
      <span class="tl-brand-glyph tl-brand-glyph-mid"></span>
      <span class="tl-brand-glyph tl-brand-glyph-dot"></span>
    </div>
    <span class="tl-fab-label">Trace</span>
  `;
  fab.addEventListener('click', () => {
    removeFab();
    if (lastRenderArgs) {
      renderOverlay(...lastRenderArgs);
    }
  });
  document.body.appendChild(fab);
}

function makeSession(result, originalText) {
  return {
    timestamp: new Date().toISOString(),
    platform_id: location.hostname,
    model_id: result.modelId || 'default',
    prompt_preview: (originalText || '').slice(0, 200),
    tokens: result.tokens || 0,
    carbon_mg: result.carbon?.mg || 0,
    water_ml: result.water?.ml || 0,
    score: result.score || 0,
    grade: result.grade || 'A',
    intent: result.intent || 'general',
    suggestion: result.suggestion || '',
  };
}

function saveSession(result, originalText) {
  try {
    chrome.runtime.sendMessage({ type: 'SAVE_SESSION', session: makeSession(result, originalText) });
  } catch (_) {}
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function buildOptimizeMarkup(originalText, rewriteResult, result) {
  const originalWords = wordCount(originalText);
  const rewrittenWords = wordCount(rewriteResult.rewritten);
  const reductionPercent = originalWords > 0
    ? Math.round(((originalWords - rewrittenWords) / originalWords) * 100)
    : 0;
  const isAlreadyOptimal = reductionPercent < 5 || rewrittenWords < 3 || rewriteResult.rewritten === originalText;

  const optimizedSection = isAlreadyOptimal
    ? `
      <div class="tl-empty-state">
        <div class="tl-empty-check">
          <span class="tl-icon tl-icon-check"></span>
        </div>
        <div class="tl-empty-copy-wrap">
          <div class="tl-empty-copy">Your prompt looks efficient already</div>
          <div class="tl-empty-sub">Nothing critical to tighten right now.</div>
        </div>
      </div>
      <div class="tl-actions">
        <button class="tl-btn-ghost" id="tl-dismiss">Dismiss</button>
      </div>
    `
    : `
      <div class="tl-section">
        <div class="tl-label">Original Prompt</div>
        <div class="tl-original">${escapeHtml(originalText)}</div>
      </div>
      <div class="tl-section">
        <div class="tl-label tl-label-green">Optimized Prompt <span class="tl-savings-chip">-${reductionPercent}% shorter</span></div>
        <div class="tl-rewritten" id="tl-rewritten">${escapeHtml(rewriteResult.rewritten)}</div>
        <div class="tl-savings">${originalWords} words → ${rewrittenWords} words · ${rewriteResult.source}</div>
      </div>
      <div class="tl-actions">
        <button class="tl-btn-primary" id="tl-replace">Replace prompt</button>
        <button class="tl-btn-ghost" id="tl-dismiss">Dismiss</button>
      </div>
    `;

  return `
    <div class="tl-hero">
      <div class="tl-hero-icon">
        <span class="tl-icon tl-icon-spark"></span>
      </div>
      <div class="tl-hero-copy">
        <div class="tl-hero-title">${isAlreadyOptimal ? 'Already efficient' : 'Optimization ready'}</div>
        <div class="tl-hero-sub">${isAlreadyOptimal ? 'Trace reviewed the prompt and found only minor issues.' : 'Trace found a clearer version with less prompt overhead.'}</div>
      </div>
    </div>

    ${optimizedSection}



    ${result.suggestion ? `
      <div class="tl-suggestion-card" style="margin-bottom:14px;">
        <div class="tl-label">
          <span class="tl-inline-icon">✦</span>
          ${result.analysisSource === 'Gemini' ? 'Gemini Insight' : 'Suggestion'}
        </div>
        <div class="tl-suggestion">${escapeHtml(result.suggestion)}</div>
      </div>
    ` : ''}

    <div class="tl-metrics-grid">
      <div class="tl-metric-card">
        <div class="tl-metric-head">
          <span class="tl-metric-icon tl-metric-icon-efficiency">📊</span>
          <span class="tl-metric-kicker">Efficiency</span>
        </div>
        <div class="tl-metric-value">${result.score}/100</div>
        <div class="tl-metric-label">${result.analysisSource || 'Local'}</div>
      </div>
      <div class="tl-metric-card">
        <div class="tl-metric-head">
          <span class="tl-metric-icon tl-metric-icon-carbon">🌿</span>
          <span class="tl-metric-kicker">Carbon</span>
        </div>
        <div class="tl-metric-value">${(result.carbon?.mg || 0).toFixed(3)}</div>
        <div class="tl-metric-label">mg CO₂e</div>
      </div>
      <div class="tl-metric-card">
        <div class="tl-metric-head">
          <span class="tl-metric-icon tl-metric-icon-water">💧</span>
          <span class="tl-metric-kicker">Water</span>
        </div>
        <div class="tl-metric-value">${(result.water?.ml || 0).toFixed(2)}</div>
        <div class="tl-metric-label">ml water</div>
      </div>
      <div class="tl-metric-card">
        <div class="tl-metric-head">
          <span class="tl-metric-icon tl-metric-icon-tokens">🔢</span>
          <span class="tl-metric-kicker">Tokens</span>
        </div>
        <div class="tl-metric-value">~${result.tokens}</div>
        <div class="tl-metric-label">estimated</div>
      </div>
    </div>
  `;
}

function buildHistoryMarkup(totals, sessions) {
  const recentSessions = sessions.slice(-4).reverse();

  return `
    <div class="tl-metrics-grid" style="margin-bottom:14px;">
      <div class="tl-metric-card">
        <div class="tl-metric-value">${(totals.session_count || 0).toLocaleString()}</div>
        <div class="tl-metric-label">Prompts</div>
      </div>
      <div class="tl-metric-card">
        <div class="tl-metric-value">${(totals.tokens || 0).toLocaleString()}</div>
        <div class="tl-metric-label">Tokens</div>
      </div>
      <div class="tl-metric-card">
        <div class="tl-metric-value">${(totals.carbon_mg || 0).toFixed(2)}</div>
        <div class="tl-metric-label">mg CO₂e</div>
      </div>
      <div class="tl-metric-card">
        <div class="tl-metric-value">${(totals.water_ml || 0).toFixed(2)}</div>
        <div class="tl-metric-label">ml water</div>
      </div>
    </div>
    <div class="tl-history-list">
      ${recentSessions.length ? recentSessions.map((session) => `
        <div class="tl-history-item">
          <div class="tl-history-top">
            <span class="tl-history-grade">${escapeHtml(session.grade || 'A')}</span>
            <span class="tl-history-date">${escapeHtml(formatDate(session.timestamp))}</span>
          </div>
          <div class="tl-history-prompt">${escapeHtml(session.prompt_preview || '')}</div>
          <div class="tl-history-meta">${session.tokens || 0} tokens · ${escapeHtml(session.intent || 'general')}</div>
        </div>
      `).join('') : '<div class="tl-history-empty">No saved sessions yet.</div>'}
    </div>
  `;
}

function buildSettingsMarkup(settings) {
  return `
    <div class="tl-settings-group">
      <label class="tl-settings-label">Gemini API Key</label>
      <input type="password" id="tl-api-key" class="tl-settings-input" placeholder="Paste key here" value="${escapeHtml(settings.gemini_api_key || '')}" />
      <div class="tl-settings-status ${settings.gemini_api_key ? 'tl-settings-status-on' : ''}">
        ${settings.gemini_api_key ? 'Gemini key saved' : 'Using local fallback'}
      </div>
    </div>
    <label class="tl-toggle">
      <input type="checkbox" id="tl-toggle-overlay" ${settings.overlay_enabled !== false ? 'checked' : ''} />
      <span>Show page panel</span>
    </label>
    <label class="tl-toggle">
      <input type="checkbox" id="tl-toggle-equiv" ${settings.show_equivalences !== false ? 'checked' : ''} />
      <span>Show equivalences in future updates</span>
    </label>
    <button class="tl-btn-ghost tl-btn-block" id="tl-clear-data">Clear saved history</button>
  `;
}

function bindTabs(panel) {
  panel.querySelectorAll('.tl-tab').forEach((button) => {
    button.addEventListener('click', () => {
      activeTab = button.dataset.tab;
      panel.querySelectorAll('.tl-tab').forEach((tab) => tab.classList.remove('active'));
      button.classList.add('active');
      panel.querySelectorAll('.tl-panel-tab').forEach((tabPanel) => {
        tabPanel.classList.toggle('active', tabPanel.dataset.tab === activeTab);
      });
    });
  });
}

function bindSettings(panel, settings) {
  panel.querySelector('#tl-api-key')?.addEventListener('change', async (event) => {
    const nextSettings = { ...settings, gemini_api_key: event.target.value.trim() };
    await chrome.storage.local.set({ settings: nextSettings });
    panel.querySelector('.tl-settings-status').textContent = nextSettings.gemini_api_key ? 'Gemini key saved' : 'Using local fallback';
    panel.querySelector('.tl-settings-status').className = `tl-settings-status${nextSettings.gemini_api_key ? ' tl-settings-status-on' : ''}`;
  });

  panel.querySelector('#tl-toggle-overlay')?.addEventListener('change', async (event) => {
    const nextSettings = { ...settings, overlay_enabled: event.target.checked };
    await chrome.storage.local.set({ settings: nextSettings });
    if (!event.target.checked) removePanel();
  });

  panel.querySelector('#tl-toggle-equiv')?.addEventListener('change', async (event) => {
    const nextSettings = { ...settings, show_equivalences: event.target.checked };
    await chrome.storage.local.set({ settings: nextSettings });
  });

  panel.querySelector('#tl-clear-data')?.addEventListener('click', async () => {
    await chrome.storage.local.set({ sessions: [], totals: {}, per_platform: {} });
    const historyPanel = panel.querySelector('.tl-panel-tab[data-tab="history"]');
    if (historyPanel) historyPanel.innerHTML = buildHistoryMarkup({}, []);
  });
}

async function renderOverlay(result, adapter, originalText, onClose) {
  const data = await chrome.storage.local.get(['settings', 'sessions', 'totals']);
  const settings = data.settings || {};
  if (settings.overlay_enabled === false) return;
  if (!originalText || originalText.trim().length < 10) return;

  const rewriteResult = result.rewrite;
  const sessions = data.sessions || [];
  const totals = data.totals || {};

  lastRenderArgs = [result, adapter, originalText, onClose];

  removeFab();
  removePanel();

  const panel = document.createElement('aside');
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <div class="tl-shell">
      <div class="tl-header">
        <div class="tl-brand">
          <div class="tl-brand-mark" aria-hidden="true">
            <span class="tl-brand-glyph tl-brand-glyph-top"></span>
            <span class="tl-brand-glyph tl-brand-glyph-mid"></span>
            <span class="tl-brand-glyph tl-brand-glyph-dot"></span>
          </div>
          <div class="tl-brand-copy">
            <span class="tl-logo">Trace</span>
            <span class="tl-tagline">AI Prompt Optimizer</span>
          </div>
        </div>
        <div class="tl-header-status">
          <span class="tl-score-label">${result.score}/100</span>
          <span class="tl-grade ${gradeClass(result.gradeColor)}">${result.grade}</span>
          <button class="tl-close" id="tl-close" aria-label="Close">✕</button>
        </div>
      </div>
      <div class="tl-tabs">
        <button class="tl-tab ${activeTab === 'optimize' ? 'active' : ''}" data-tab="optimize">Optimize</button>
        <button class="tl-tab ${activeTab === 'history' ? 'active' : ''}" data-tab="history">History</button>
        <button class="tl-tab ${activeTab === 'settings' ? 'active' : ''}" data-tab="settings">Settings</button>
      </div>
      <div class="tl-body">
        <section class="tl-panel-tab ${activeTab === 'optimize' ? 'active' : ''}" data-tab="optimize">
          ${buildOptimizeMarkup(originalText, rewriteResult, result)}
        </section>
        <section class="tl-panel-tab ${activeTab === 'history' ? 'active' : ''}" data-tab="history">
          ${buildHistoryMarkup(totals, sessions)}
        </section>
        <section class="tl-panel-tab ${activeTab === 'settings' ? 'active' : ''}" data-tab="settings">
          ${buildSettingsMarkup(settings)}
        </section>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  bindTabs(panel);
  bindSettings(panel, settings);

  panel.querySelector('#tl-close')?.addEventListener('click', () => {
    removePanel();
    showFab();
    saveSession(result, originalText);
    if (typeof onClose === 'function') onClose();
  });

  panel.querySelector('#tl-dismiss')?.addEventListener('click', () => {
    removePanel();
    showFab();
    saveSession(result, originalText);
    if (typeof onClose === 'function') onClose();
  });

  const replaceBtn = panel.querySelector('#tl-replace');
  if (replaceBtn) {
    let replaced = false;
    replaceBtn.addEventListener('click', () => {
      if (replaced || !adapter || typeof adapter.setText !== 'function') return;
      adapter.setText(rewriteResult.rewritten);
      replaced = true;
      replaceBtn.textContent = 'Replaced ✓';
      replaceBtn.classList.add('tl-btn-replaced');
      replaceBtn.disabled = true;
    });
  }
}

export { renderOverlay, removePanel };

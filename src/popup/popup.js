// popup.js — Trace AI Layer popup controller

import { optimizePrompt } from '../optimizer/optimizer.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str);
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function getWordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── Tab navigation ────────────────────────────────────────────────────────────

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById('tab-' + btn.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });
}

// ── Tab 1: Optimize ───────────────────────────────────────────────────────────

async function renderOptimizeTab() {
  const el = document.getElementById('optimize-content');
  if (!el) return;

  el.innerHTML = '<div class="loading">Reading current prompt…</div>';

  // Try to get the current prompt from the active AI tab
  let promptText = '';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PROMPT' }).catch(() => null);
      promptText = response?.text?.trim() || '';
    }
  } catch (_) {}

  // Fallback: read last stored prompt
  if (!promptText) {
    const data = await chrome.storage.local.get(['currentPrompt']).catch(() => ({}));
    promptText = data.currentPrompt?.trim() || '';
  }

  if (!promptText) {
    el.innerHTML = `
      <div class="empty-optimize">
        <div class="empty-icon">✦</div>
        <div class="empty-title">No prompt detected</div>
        <div class="empty-sub">Open ChatGPT, Claude, or Gemini and start typing a prompt, then click the extension icon.</div>
      </div>`;
    return;
  }

  const data = await chrome.storage.local.get(['settings']).catch(() => ({}));
  const apiKey = data.settings?.gemini_api_key || '';
  const result = await optimizePrompt(promptText, 'default', apiKey);
  const rewriteResult = result.rewrite;
  const origWords = getWordCount(promptText);
  const newWords = getWordCount(rewriteResult.rewritten);
  const pct = origWords > 0 ? Math.round(((origWords - newWords) / origWords) * 100) : 0;
  const rw = {
    rewritten: rewriteResult.rewritten,
    origWords,
    newWords,
    pct,
    source: rewriteResult.source,
  };
  const isOptimal = rw.pct < 5 || rw.newWords < 3 || rw.rewritten === promptText;

  el.innerHTML = `
    <div class="hero-card">
      <div class="hero-eyebrow">Current Session</div>
      <div class="hero-title">${isOptimal ? 'Prompt already in good shape' : 'Cleaner version ready'}</div>
      <div class="hero-sub">${result.analysisSource === 'Gemini' ? 'Gemini reviewed the prompt and proposed the update.' : result.geminiError ? `Gemini failed and local fallback was used. ${escapeHtml(result.geminiError)}` : 'Local analysis is active.'}</div>
    </div>

    <div class="optimize-section">
      <div class="opt-label">Original prompt</div>
      <div class="opt-original">${escapeHtml(promptText)}</div>
    </div>

    ${!isOptimal ? `
    <div class="optimize-section">
      <div class="opt-label opt-label-green">Optimized prompt <span class="opt-savings">−${rw.pct}% shorter</span></div>
      <div class="opt-rewritten" id="opt-rewritten">${escapeHtml(rw.rewritten)}</div>
      <div class="opt-wordcount">${rw.origWords} words → ${rw.newWords} words · Analysis: ${result.analysisSource} · Rewrite: ${rw.source}</div>
    </div>
    <div class="mini-grid">
      <div class="mini-stat">
        <div class="mini-stat-value">${result.score}</div>
        <div class="mini-stat-label">Efficiency Score</div>
      </div>
      <div class="mini-stat">
        <div class="mini-stat-value">${result.grade}</div>
        <div class="mini-stat-label">Grade</div>
      </div>
    </div>
    <div class="action-card">
      <button class="btn-replace" id="btn-replace">Replace prompt on page</button>
    </div>
    ` : `
    <div class="optimize-section">
      <div class="opt-already">✓ Your prompt looks efficient already</div>
      <div class="opt-wordcount">Analysis: ${result.analysisSource} · Rewrite: ${rw.source}</div>
    </div>
    `}

    <div class="action-card">
      <button class="btn-refresh" id="btn-refresh">↺ Re-read prompt</button>
    </div>
  `;

  document.getElementById('btn-refresh')?.addEventListener('click', renderOptimizeTab);

  const replaceBtn = document.getElementById('btn-replace');
  if (replaceBtn) {
    replaceBtn.addEventListener('click', async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;
        await chrome.tabs.sendMessage(tab.id, { type: 'REPLACE_PROMPT', text: rw.rewritten });
        replaceBtn.textContent = '✓ Replaced!';
        replaceBtn.classList.add('btn-replaced');
        replaceBtn.disabled = true;
      } catch (_) {
        replaceBtn.textContent = 'Could not replace — reload the tab and try again';
      }
    });
  }
}

// ── Tab 2: History ────────────────────────────────────────────────────────────

async function renderHistoryTab() {
  const el = document.getElementById('history-content');
  if (!el) return;

  const data = await chrome.storage.local.get(['totals', 'sessions']).catch(() => ({}));
  const totals   = data.totals   || {};
  const sessions = data.sessions || [];

  const gradeCounts = { A:0, B:0, C:0, D:0, F:0 };
  sessions.forEach(s => { if (s.grade && s.grade in gradeCounts) gradeCounts[s.grade]++; });

  el.innerHTML = `
    <div class="hero-card">
      <div class="hero-eyebrow">Usage Snapshot</div>
      <div class="hero-title">Prompt activity at a glance</div>
      <div class="hero-sub">Quick view of total prompts, token volume, and recent quality distribution.</div>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-val">${(totals.session_count || 0)}</div><div class="stat-lbl">Prompts</div></div>
      <div class="stat-card"><div class="stat-val">${(totals.tokens || 0).toLocaleString()}</div><div class="stat-lbl">Tokens est.</div></div>
      <div class="stat-card"><div class="stat-val">${(totals.carbon_mg || 0).toFixed(2)}</div><div class="stat-lbl">mg CO₂e</div></div>
      <div class="stat-card"><div class="stat-val">${(totals.water_ml || 0).toFixed(2)}</div><div class="stat-lbl">ml water</div></div>
    </div>
    <div class="grade-row">
      ${Object.entries(gradeCounts).map(([g, c]) =>
        `<span class="grade-chip grade-${g.toLowerCase()}">${g} <b>${c}</b></span>`
      ).join('')}
    </div>
    <div class="history-list">
      ${(sessions.slice(-3).reverse()).map((session) => `
        <div class="history-item">
          <div class="history-item-title">${escapeHtml(session.prompt_preview || 'Untitled prompt')}</div>
          <div class="history-item-sub">${session.tokens || 0} tokens · ${escapeHtml(session.intent || 'general')} · grade ${escapeHtml(session.grade || 'A')}</div>
        </div>
      `).join('') || '<div class="history-item"><div class="history-item-title">No recent prompts</div><div class="history-item-sub">Use the extension on an AI page and activity will show up here.</div></div>'}
    </div>
    <div class="action-card">
      <button class="btn-dash" id="open-dashboard">Open full dashboard ↗</button>
    </div>
  `;

  document.getElementById('open-dashboard')?.addEventListener('click', async () => {
    const d = await chrome.storage.local.get(['settings']).catch(() => ({}));
    chrome.tabs.create({ url: (d.settings || {}).dashboard_url || 'http://localhost:3000' });
  });
}

// ── Tab 3: Settings ───────────────────────────────────────────────────────────

async function renderSettingsTab() {
  const el = document.getElementById('settings-content');
  if (!el) return;

  const data = await chrome.storage.local.get(['settings']).catch(() => ({}));
  const settings = data.settings || {};

  el.innerHTML = `
    <div class="hero-card">
      <div class="hero-eyebrow">Controls</div>
      <div class="hero-title">Tune how Trace behaves</div>
      <div class="hero-sub">Manage Gemini access, visibility, and exported session data from one place.</div>
    </div>

    <div class="settings-group">
      <label class="settings-label">Gemini API Key <span class="settings-hint">(optional — free at aistudio.google.com)</span></label>
      <input type="password" id="api-key-input" class="settings-input" placeholder="Paste key here…" value="${escapeHtml(settings.gemini_api_key || '')}" />
      <span id="api-status" class="api-status ${settings.gemini_api_key ? 'api-ok' : ''}">${settings.gemini_api_key ? '✓ Gemini key saved' : 'Using local rewriter'}</span>
    </div>
    <div class="settings-group">
      <label class="toggle-label"><input type="checkbox" id="tog-overlay" ${settings.overlay_enabled !== false ? 'checked' : ''} /><span>Show page overlay</span></label>
      <label class="toggle-label"><input type="checkbox" id="tog-equiv" ${settings.show_equivalences !== false ? 'checked' : ''} /><span>Show equivalences</span></label>
    </div>
    <div class="settings-group settings-actions">
      <button id="export-btn" class="settings-btn">Export JSON</button>
      <button id="clear-btn" class="settings-btn danger">Clear data</button>
    </div>
    <div class="settings-info">
      <span>Gemini is used only when the live API call succeeds; otherwise Trace falls back locally.</span>
    </div>
  `;

  // API key save
  document.getElementById('api-key-input')?.addEventListener('change', async e => {
    const cur = await chrome.storage.local.get(['settings']).catch(() => ({}));
    const s = cur.settings || {};
    s.gemini_api_key = e.target.value.trim();
    await chrome.storage.local.set({ settings: s });
    const status = document.getElementById('api-status');
    if (status) {
      status.textContent = s.gemini_api_key ? '✓ Gemini key saved' : 'Using local rewriter';
      status.className = 'api-status' + (s.gemini_api_key ? ' api-ok' : '');
    }
  });

  // Toggles
  for (const [id, key] of [['tog-overlay','overlay_enabled'],['tog-equiv','show_equivalences']]) {
    document.getElementById(id)?.addEventListener('change', async e => {
      const cur = await chrome.storage.local.get(['settings']).catch(() => ({}));
      const s = cur.settings || {};
      s[key] = e.target.checked;
      await chrome.storage.local.set({ settings: s });
    });
  }

  // Export
  document.getElementById('export-btn')?.addEventListener('click', async () => {
    const all = await chrome.storage.local.get(null);
    const url = URL.createObjectURL(new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' }));
    chrome.downloads.download({ url, filename: `trace-export-${Date.now()}.json` });
  });

  // Clear
  document.getElementById('clear-btn')?.addEventListener('click', async () => {
    if (confirm('Clear all session data?')) {
      await chrome.storage.local.clear();
      renderHistoryTab();
    }
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  initTabs();
  await renderOptimizeTab();
  // Load other tabs in background
  renderHistoryTab();
  renderSettingsTab();

  // Re-render optimize tab when switching to it
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'optimize') renderOptimizeTab();
    });
  });
}

document.addEventListener('DOMContentLoaded', init);

// popup.js — Trace AI Layer popup controller

// ── Inline local rewriter (so popup doesn't need a separate bundle) ──────────

const FILLER_REMOVALS = [
  // Greetings
  /^good\s+(morning|afternoon|evening|night)[,!.]?\s*/i,
  /^(hey|hi|hello)[,!.]?\s*/i,
  // Opener phrases
  /\bi (wanted|want|need|would like) to (know|ask|understand|find out)\s*/gi,
  /\bi('m| am) (curious|wondering) (about|if|whether)\s*/gi,
  /\bi was wondering (if|whether|about)\s*/gi,
  /\bcan you\s+/gi,
  /\bcould you\s+/gi,
  /\bplease\s+/gi,
  /\bkindly\s+/gi,
  /\bi want you to\s+/gi,
  /\bi need you to\s+/gi,
  /\bi would like you to\s+/gi,
  /\bwould you mind\s+/gi,
  /\bif you don'?t mind[,.]?\s*/gi,
  /\bplease help me\s+/gi,
  // Mid-sentence filler
  /\bi mean[,]?\s*/gi,
  /,?\s*\blike\b\s*,?/gi,
  /\brn\b/gi,
  /\bbasically\b/gi,
  /\bactually\b/gi,
  /\bliterally\b/gi,
  /\bkind of\b/gi,
  /\bsort of\b/gi,
  // Trailing politeness
  /\bthanks? (in advance|so much|a lot)[.!]?\s*$/gi,
  /\bthank you[.!]?\s*$/gi,
  // Trailing discourse artifacts
  /[,.]?\s*\bhow\b\s*\?*\s*$/gi,
  // Double punctuation
  /\?{2,}/g,
];

const VERBOSE_REPLACEMENTS = [
  [/\bin order to\b/gi, 'to'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bat this point in time\b/gi, ''],
  [/\bat the present time\b/gi, ''],
  [/\bin the event that\b/gi, 'if'],
  [/\bwith regard to\b/gi, 'about'],
  [/\ba large number of\b/gi, 'many'],
  [/\bthe majority of\b/gi, 'most'],
  [/\bis able to\b/gi, 'can'],
  [/\bjust\b/gi, ''],
];

function localRewrite(text) {
  let result = text;
  for (const p of FILLER_REMOVALS) result = result.replace(p, ' ');
  for (const [p, r] of VERBOSE_REPLACEMENTS) result = result.replace(p, r);
  // Collapse spaces, fix punctuation, remove duplicate adjacent words
  result = result.replace(/\s{2,}/g, ' ').trim();
  result = result.replace(/\s+([?!.,])/g, '$1');
  result = result.replace(/\b(\w+)\s+\1\b/gi, '$1');
  // Capitalise first letter
  if (result.length > 0) result = result.charAt(0).toUpperCase() + result.slice(1);
  // Add question mark if it ends without punctuation and looks like a question
  if (result && !/[?!.]$/.test(result)) result += '?';

  const origWords = text.trim().split(/\s+/).filter(Boolean).length;
  const newWords  = result.trim().split(/\s+/).filter(Boolean).length;
  const pct = origWords > 0 ? Math.round(((origWords - newWords) / origWords) * 100) : 0;

  return { rewritten: result, origWords, newWords, pct };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str);
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
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

  const rw = localRewrite(promptText);
  const isOptimal = rw.pct < 5 || rw.newWords < 3 || rw.rewritten === promptText;

  el.innerHTML = `
    <div class="optimize-section">
      <div class="opt-label">Original prompt</div>
      <div class="opt-original">${escapeHtml(promptText)}</div>
    </div>

    ${!isOptimal ? `
    <div class="optimize-section">
      <div class="opt-label opt-label-green">Optimized prompt <span class="opt-savings">−${rw.pct}% shorter</span></div>
      <div class="opt-rewritten" id="opt-rewritten">${escapeHtml(rw.rewritten)}</div>
      <div class="opt-wordcount">${rw.origWords} words → ${rw.newWords} words</div>
    </div>
    <button class="btn-replace" id="btn-replace">Replace prompt on page</button>
    ` : `
    <div class="optimize-section">
      <div class="opt-already">✓ Your prompt looks efficient already</div>
    </div>
    `}

    <button class="btn-refresh" id="btn-refresh">↺ Re-read prompt</button>
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
    <button class="btn-dash" id="open-dashboard">Open full dashboard ↗</button>
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
    <div class="settings-group">
      <label class="settings-label">Gemini API Key <span class="settings-hint">(optional — free at aistudio.google.com)</span></label>
      <input type="password" id="api-key-input" class="settings-input" placeholder="Paste key here…" value="${escapeHtml(settings.gemini_api_key || '')}" />
      <span id="api-status" class="api-status ${settings.gemini_api_key ? 'api-ok' : ''}">${settings.gemini_api_key ? '✓ Gemini active' : 'Using local rewriter'}</span>
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
      <span>Rewriter: Local rule-based${settings.gemini_api_key ? ' + Gemini' : ''}</span>
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
      status.textContent = s.gemini_api_key ? '✓ Gemini active' : 'Using local rewriter';
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

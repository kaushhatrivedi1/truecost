// overlay.js — Floating panel overlay for Trace AI Layer

import { localRewrite } from '../rewriter/local-rewriter.js';

const PANEL_ID = 'tl-panel';

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

function removePanel() {
  const existing = document.getElementById(PANEL_ID);
  if (existing) existing.remove();
}

function saveSession(result) {
  try {
    chrome.runtime.sendMessage({ type: 'SAVE_SESSION', payload: result });
  } catch (_) {}
}

async function renderOverlay(result, adapter, originalText) {
  try {
    const data = await chrome.storage.local.get(['settings']);
    const settings = data.settings || {};
    if (settings.overlay_enabled === false) return;
  } catch (_) {}

  if (!originalText || originalText.trim().length < 10) return;

  const { tokens, carbon, water, score, grade, gradeColor, suggestion } = result;

  // Run local rewrite instantly (synchronous)
  const rewriteResult = localRewrite(originalText);
  const isAlreadyOptimal =
    rewriteResult.reductionPercent < 5 || rewriteResult.rewrittenWords < 3;

  removePanel();

  const panel = document.createElement('div');
  panel.id = PANEL_ID;

  const carbonVal = carbon?.mg != null ? carbon.mg.toFixed(3) : '0.000';
  const waterVal = water?.ml != null ? water.ml.toFixed(2) : '0.00';

  const optimizedSection = isAlreadyOptimal
    ? `<div class="tl-optimal">✓ Already efficient</div>`
    : `
      <div class="tl-section">
        <div class="tl-label">Suggested rewrite</div>
        <div class="tl-rewritten" id="tl-rewritten">${escapeHtml(rewriteResult.rewritten)}</div>
        <div class="tl-savings">${rewriteResult.originalWords} → ${rewriteResult.rewrittenWords} words · ${rewriteResult.reductionPercent}% shorter</div>
      </div>
      <div class="tl-actions">
        <button class="tl-btn-primary" id="tl-replace">Replace prompt</button>
        <button class="tl-btn-ghost" id="tl-dismiss">Dismiss</button>
      </div>`;

  const dismissOnlySection = isAlreadyOptimal
    ? `<div class="tl-actions"><button class="tl-btn-ghost" id="tl-dismiss">Dismiss</button></div>`
    : '';

  panel.innerHTML = `
    <div class="tl-header">
      <div class="tl-title-row">
        <span class="tl-logo">Trace</span>
        <span class="tl-score-label">${score}/100</span>
        <span class="tl-grade ${gradeClass(gradeColor)}">${grade}</span>
      </div>
      <button class="tl-close" id="tl-close" aria-label="Close">✕</button>
    </div>

    ${optimizedSection}
    ${dismissOnlySection}

    ${suggestion ? `<div class="tl-suggestion">${escapeHtml(suggestion)}</div>` : ''}

    <div class="tl-footer">
      <span title="Carbon estimate (Luccioni et al. 2023)">⚡ ${carbonVal} mg CO₂e</span>
      <span title="Water estimate (Li et al. 2023)">💧 ${waterVal} ml</span>
      <span class="tl-token-count">~${tokens} tokens</span>
    </div>
  `;

  document.body.appendChild(panel);

  // Close button
  document.getElementById('tl-close').addEventListener('click', () => {
    removePanel();
    saveSession(result);
  });

  // Dismiss button
  const dismissBtn = document.getElementById('tl-dismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      removePanel();
      saveSession(result);
    });
  }

  // Replace button
  const replaceBtn = document.getElementById('tl-replace');
  if (replaceBtn) {
    let replaced = false;
    replaceBtn.addEventListener('click', () => {
      if (!replaced && adapter && typeof adapter.setText === 'function') {
        adapter.setText(rewriteResult.rewritten);
        replaced = true;
        replaceBtn.textContent = 'Replaced ✓';
        replaceBtn.classList.add('tl-btn-replaced');
        replaceBtn.disabled = true;
      }
    });
  }
}

export { renderOverlay, removePanel };

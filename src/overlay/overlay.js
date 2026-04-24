// overlay.js — Overlay badge renderer

import { rewrite } from '../rewriter/rewriter.js';

/**
 * Sends a SAVE_SESSION message to the background service worker.
 * @param {Object} result - The ResultObject to save as a session.
 */
function saveSession(result) {
  chrome.runtime.sendMessage({ type: 'SAVE_SESSION', payload: result });
}

/**
 * Returns the CSS colour class name for a given gradeColor string.
 * @param {string} gradeColor
 * @returns {string}
 */
function gradeClass(gradeColor) {
  const map = {
    green: 'grade-green',
    teal: 'grade-teal',
    amber: 'grade-amber',
    orange: 'grade-orange',
    red: 'grade-red',
  };
  return map[gradeColor] || 'grade-green';
}

/**
 * Renders the rewrite result panel inside the overlay.
 * @param {HTMLElement} overlay - The overlay DOM element.
 * @param {Object} rewriteResult - The RewriteResult object.
 * @param {Object} adapter - The platform adapter.
 * @param {string} originalText - The original prompt text.
 */
function renderRewriteResult(overlay, rewriteResult, adapter, originalText) {
  // Remove any existing rewrite panel
  const existing = overlay.querySelector('.trace-rewrite-panel');
  if (existing) existing.remove();

  const { rewritten, tokenDelta, percentSaved, changes, source } = rewriteResult;

  const panel = document.createElement('div');
  panel.className = 'trace-rewrite-panel';

  const deltaSign = tokenDelta <= 0 ? '' : '+';
  const changesHtml = (changes || [])
    .slice(0, 3)
    .map((c) => `<li class="trace-change-item">${escapeHtml(c)}</li>`)
    .join('');

  panel.innerHTML = `
    <div class="trace-rewrite-section">
      <div class="trace-rewrite-label">Original</div>
      <div class="trace-rewrite-original">${escapeHtml(originalText)}</div>
    </div>
    <div class="trace-rewrite-section">
      <div class="trace-rewrite-label">Rewritten</div>
      <div class="trace-rewrite-rewritten">${escapeHtml(rewritten)}</div>
    </div>
    <div class="trace-rewrite-meta">
      <span class="trace-token-delta">${deltaSign}${tokenDelta} tokens</span>
      <span class="trace-percent-saved">${Math.abs(percentSaved).toFixed(1)}% saved</span>
      <span class="trace-source-label">Source: ${escapeHtml(source)}</span>
    </div>
    ${changesHtml ? `<ul class="trace-changes-list">${changesHtml}</ul>` : ''}
    <div class="trace-rewrite-actions">
      <button class="trace-btn trace-btn-apply">Apply</button>
    </div>
  `;

  overlay.appendChild(panel);

  let applied = false;
  const applyBtn = panel.querySelector('.trace-btn-apply');

  applyBtn.addEventListener('click', () => {
    if (!applied) {
      adapter.setText(rewritten);
      applyBtn.textContent = 'Undo';
      applied = true;
    } else {
      adapter.setText(originalText);
      applyBtn.textContent = 'Apply';
      applied = false;
    }
  });
}

/**
 * Escapes HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Creates or updates the trace overlay badge in the DOM.
 * @param {Object} result - The ResultObject from the analysis pipeline.
 * @param {Object} adapter - The platform adapter (must implement setText).
 */
async function renderOverlay(result, adapter) {
  // Read settings from chrome.storage.local
  let settings = {};
  try {
    const data = await chrome.storage.local.get(['settings']);
    settings = data.settings || {};
  } catch (_) {
    settings = {};
  }

  // Respect overlay_enabled setting (default: true)
  if (settings.overlay_enabled === false) {
    return;
  }

  const showEquivalences = settings.show_equivalences !== false; // default true

  const {
    tokens,
    tokenLabel,
    carbon,
    water,
    equivalences,
    score,
    grade,
    gradeColor,
    modelId,
    suggestion,
  } = result;

  const platformLabel = modelId && modelId !== 'default' ? modelId : 'AI Platform';

  // Build overlay HTML
  const carbonValue = carbon && carbon.mg != null ? carbon.mg.toFixed(4) : '0.0000';
  const waterValue = water && water.ml != null ? water.ml.toFixed(4) : '0.0000';
  const tokenCount = tokens != null ? tokens : 0;
  const tokenSuffix = tokenLabel || 'est.';

  let equivalencesHtml = '';
  if (showEquivalences && equivalences) {
    equivalencesHtml = `
      <div class="trace-equivalences">
        <div class="trace-equiv-title">Equivalences</div>
        <div class="trace-equiv-item">
          <span class="trace-equiv-label">Phone charge:</span>
          <span class="trace-equiv-value">${(equivalences.phoneChargeSeconds || 0).toFixed(2)} sec</span>
        </div>
        <div class="trace-equiv-item">
          <span class="trace-equiv-label">Google searches:</span>
          <span class="trace-equiv-value">${(equivalences.googleSearches || 0).toFixed(4)}</span>
        </div>
        <div class="trace-equiv-item">
          <span class="trace-equiv-label">Words equivalent:</span>
          <span class="trace-equiv-value">${(equivalences.wordsEquivalent || 0).toFixed(1)}</span>
        </div>
      </div>
    `;
  }

  const overlayHtml = `
    <div class="trace-header">
      <span class="trace-platform-label">${escapeHtml(platformLabel)}</span>
      <span class="trace-grade ${gradeClass(gradeColor)}">${escapeHtml(grade)}</span>
    </div>
    <div class="trace-metrics">
      <div class="trace-metric">
        <span class="trace-metric-label">Score</span>
        <span class="trace-metric-value trace-score">${score}</span>
      </div>
      <div class="trace-metric">
        <span class="trace-metric-label">Tokens</span>
        <span class="trace-metric-value trace-tokens">${tokenCount} ${tokenSuffix}</span>
      </div>
      <div class="trace-metric">
        <span class="trace-metric-label">Carbon</span>
        <span class="trace-metric-value trace-carbon">${carbonValue} mg CO₂e (est.)</span>
      </div>
      <div class="trace-metric">
        <span class="trace-metric-label">Water</span>
        <span class="trace-metric-value trace-water">${waterValue} ml (est.)</span>
      </div>
    </div>
    ${equivalencesHtml}
    <div class="trace-suggestion">${escapeHtml(suggestion || '')}</div>
    <div class="trace-actions">
      <button class="trace-btn trace-btn-optimise">Optimise prompt</button>
      <button class="trace-btn trace-btn-dismiss">Dismiss</button>
    </div>
    <div class="trace-spinner" style="display:none;"></div>
  `;

  // Find or create the overlay element
  let overlay = document.getElementById('trace-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'trace-overlay';

    // Inject as sibling after the textarea's parent container
    let injected = false;
    if (adapter && typeof adapter.getElement === 'function') {
      const el = adapter.getElement();
      if (el && el.parentElement) {
        el.parentElement.insertAdjacentElement('afterend', overlay);
        injected = true;
      }
    }
    if (!injected) {
      document.body.appendChild(overlay);
    }
  }

  overlay.innerHTML = overlayHtml;
  overlay.style.display = '';

  // Wire up "Optimise prompt" button
  const optimiseBtn = overlay.querySelector('.trace-btn-optimise');
  const spinner = overlay.querySelector('.trace-spinner');

  optimiseBtn.addEventListener('click', async () => {
    const originalText = adapter && typeof adapter.getText === 'function'
      ? adapter.getText()
      : '';

    // Show loading spinner
    optimiseBtn.disabled = true;
    if (spinner) spinner.style.display = '';

    try {
      let apiKey = '';
      try {
        const settingsData = await chrome.storage.local.get(['settings']);
        apiKey = (settingsData.settings && settingsData.settings.gemini_api_key) || '';
      } catch (_) {
        apiKey = '';
      }

      const rewriteResult = await rewrite(originalText, apiKey);
      renderRewriteResult(overlay, rewriteResult, adapter, originalText);
    } finally {
      optimiseBtn.disabled = false;
      if (spinner) spinner.style.display = 'none';
    }
  });

  // Wire up "Dismiss" button
  const dismissBtn = overlay.querySelector('.trace-btn-dismiss');
  dismissBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    saveSession(result);
  });
}

export { renderOverlay, saveSession, renderRewriteResult };

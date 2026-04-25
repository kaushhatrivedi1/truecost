// Content script injected into the Trace dashboard.
// Bridges chrome.storage.local → page JS via postMessage,
// since content scripts and page JS run in isolated JS worlds.

function pushStorageToPage() {
  chrome.runtime.sendMessage({ type: 'GET_STORAGE' }, (response) => {
    if (chrome.runtime.lastError) return; // extension context gone
    if (response?.ok) {
      window.postMessage({ type: 'TRACE_DATA', data: response.data }, '*');
    }
  });
}

// Respond to on-demand requests from the page
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type === 'TRACE_REQUEST_DATA') {
    pushStorageToPage();
  }
});

// Push once immediately when bridge loads
pushStorageToPage();

// Re-push whenever storage changes (live updates while user is prompting)
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === 'local') pushStorageToPage();
});

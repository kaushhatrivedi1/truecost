// Content script injected into the Trace dashboard.
// Bridges chrome.storage.local → page JS via postMessage,
// since content scripts and page JS run in isolated JS worlds.

const DASHBOARD_ORIGIN = location.origin; // localhost:3000 or localhost:3001

function pushStorageToPage() {
  chrome.runtime.sendMessage({ type: 'GET_STORAGE' }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response?.ok) {
      globalThis.postMessage({ type: 'TRACE_DATA', data: response.data }, DASHBOARD_ORIGIN);
    }
  });
}

globalThis.addEventListener('message', (event) => {
  if (event.origin !== DASHBOARD_ORIGIN) return;
  if (event.data?.type === 'TRACE_REQUEST_DATA') {
    pushStorageToPage();
  }
});

pushStorageToPage();

chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === 'local') pushStorageToPage();
});

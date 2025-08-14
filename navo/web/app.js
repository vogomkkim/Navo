const statusEl = document.getElementById('status');
const canvasEl = document.getElementById('canvas');
const infoEl = document.getElementById('info');
const saveBtn = document.getElementById('saveBtn');

init();

async function init() {
  setStatus('Loading draft…');
  try {
    const res = await fetch('/api/draft');
    const data = await res.json();
    canvasEl.innerHTML = data?.draft?.html || '<section></section>';
    infoEl.textContent = `Draft loaded in ${data.tookMs ?? 0} ms`;
    setStatus('Ready');
    track({ type: 'view:page', page: 'editor' });
  } catch (e) {
    setStatus('Failed to load draft');
  }
}

saveBtn.addEventListener('click', async () => {
  setStatus('Saving…');
  const payload = { html: canvasEl.innerHTML };
  try {
    const res = await fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    setStatus(`Saved (${data.versionId})`);
    track({ type: 'editor:change', versionId: data.versionId });
  } catch (e) {
    setStatus('Save failed');
  }
});

canvasEl.addEventListener('click', (ev) => {
  const target = ev.target?.tagName || 'UNKNOWN';
  track({ type: 'click:canvas', target });
});

let eventQueue = [];
let flushTimer = null;

function track(event) {
  eventQueue.push({ ...event, ts: Date.now() });
  if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, 500);
  }
}

async function flushEvents() {
  const batch = eventQueue.splice(0, eventQueue.length);
  flushTimer = null;
  if (batch.length === 0) return;
  try {
    await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events: batch }) });
  } catch (_) {
    // ignore errors for mock
  }
}

function setStatus(text) {
  statusEl.textContent = text;
}
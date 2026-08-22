/* Safe, non-destructive lyrics module with line-only highlighting, click-to-seek,
   and simple line-level Tap Sync API (jukeboxStartLineTapSync, jukeboxRegisterLineTap, jukeboxStopLineTapSync). */

/* ---------------- GLOBALS ---------------- */
let currentLyrics = [];
let _lastActiveLineIndex = -1;
let _userScrolledAt = 0;
const USER_SCROLL_PAUSE_MS = 3000;

console.log('lyrics-final loaded: local-build v20260819-undo');

// Tap sync state
let _lineTapSyncActive = false;
let _lineTapIndex = 0;

/* ---------------- PARSE TIMESTAMP ---------------- */
function parseTimestamp(ts) {
  const m = ts && ts.match(/^

\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]

$/);
  if (!m) return NaN;
  const min = parseInt(m[1], 10), sec = parseInt(m[2], 10), frac = m[3] ? parseFloat('0.' + m[3]) : 0;
  return min * 60 + sec + frac;
}

/* ---------------- LOAD LYRICS FILE ---------------- */
async function loadLyricsFile(path) {
  try {
    const res = await fetch(path);
    const text = await res.text();
    const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const rx = new RegExp('\

\[(\\d{1,2}):(\\d{2})(?:\\.(\\d{1,3}))?\\]

','g');
    const out = []; let last = 0;
    for (let raw of rawLines) {
      const matches = raw.match(rx);
      let seconds = matches && matches.length ? parseTimestamp(matches[matches.length - 1]) : last + 0.001;
      if (Number.isNaN(seconds)) seconds = last + 0.001;
      let text = raw.replace(rx, '').trim().replace(/^<|>$/g, '').trim();
      out.push({ text, seconds });
      last = seconds;
    }
    return out.map(l => ({ text: l.text, seconds: Number.isFinite(l.seconds) ? l.seconds : 0 })).sort((a, b) => a.seconds - b.seconds);
  } catch (e) {
    console.error('lyrics-final.js: load failed', e);
    return [];
  }
}

/* ---------------- HELPERS ---------------- */
function resolveScrollContainer(container) {
  if (!container || container === document || container === document.body) {
    const found = document.querySelector('.lyrics-scroll');
    if (found) return found;
    console.error('lyrics-final.js: .lyrics-scroll not found');
    return null;
  }
  if (container.classList && container.classList.contains('lyrics-scroll')) return container;
  try { const found = container.querySelector && container.querySelector('.lyrics-scroll'); if (found) return found; } catch (e) { }
  console.error('lyrics-final.js: .lyrics-scroll not found inside provided container');
  return null;
}

/* ---------------- RENDER ---------------- */
function renderLyrics(lyrics, container) {
  const sc = resolveScrollContainer(container);
  if (!sc) return;
  sc.innerHTML = '';
  sc.scrollTop = 0;
  _lastActiveLineIndex = -1;

  lyrics.forEach((line, i) => {
    const d = document.createElement('div');
    d.dataset.line = i;
    d.className = 'lyrics-line';
    d.textContent = line.text || '';
    d.addEventListener('click', () => {
      const audio = document.querySelector('audio');
      if (!audio) return;
      const secs = Number.isFinite(currentLyrics[i].seconds) ? currentLyrics[i].seconds : 0;
      audio.currentTime = secs;
    });
    sc.appendChild(d);
  });
}

/* ---------------- USER SCROLL LISTENERS ---------------- */
function initLyricsScrollUserListeners() {
  if (initLyricsScrollUserListeners._inited) return;
  initLyricsScrollUserListeners._inited = true;
  const el = document.querySelector('.lyrics-scroll');
  if (!el) return;
  const mark = () => { _userScrolledAt = Date.now(); };
  el.addEventListener('wheel', mark, { passive: true });
  el.addEventListener('touchstart', mark, { passive: true });
  el.addEventListener('scroll', mark, { passive: true });
}

/* ---------------- AUTO SCROLL & HIGHLIGHT ---------------- */
function highlightActiveLine(idx, sc) {
  if (!sc) return;
  sc.querySelectorAll('[data-line]').forEach(el => {
    el.classList.toggle('active-line', parseInt(el.dataset.line, 10) === idx);
  });
}

function autoScrollLyrics(time, lyrics, container) {
  if (!container || !lyrics || !lyrics.length) return;
  const sc = resolveScrollContainer(container);
  if (!sc) return;

  const firstTime = Number.isFinite(lyrics[0].seconds) ? lyrics[0].seconds : 0;
  if (typeof time !== 'number' || Number.isNaN(time)) return;
  if (time < Math.max(0.05, firstTime - 0.01)) return;

  let active = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (time >= lyrics[i].seconds) active = i;
    else break;
  }
  if (active === -1) return;

  if (Date.now() - _userScrolledAt < USER_SCROLL_PAUSE_MS) {
    _lastActiveLineIndex = active;
    highlightActiveLine(active, sc);
    return;
  }

  if (active === _lastActiveLineIndex) {
    highlightActiveLine(active, sc);
    return;
  }

  const el = sc.querySelector(`[data-line="${active}"]`);
  if (!el) { _lastActiveLineIndex = active; return; }

  const crect = sc.getBoundingClientRect();
  const lrect = el.getBoundingClientRect();
  const relativeTop = lrect.top - crect.top + sc.scrollTop;
  let offset = relativeTop - (sc.clientHeight / 2) + (el.clientHeight / 2);
  const max = Math.max(0, sc.scrollHeight - sc.clientHeight);
  if (offset < 0) offset = 0; if (offset > max) offset = max;

  try { sc.scrollTo({ top: offset, behavior: 'smooth' }); } catch (e) { sc.scrollTop = offset; }

  _lastActiveLineIndex = active;
  highlightActiveLine(active, sc);
}

/* ---------------- UPDATE UI ---------------- */
function updateLyricsUIForJukebox(audio, container) {
  if (!currentLyrics || !currentLyrics.length) return;
  autoScrollLyrics(audio.currentTime, currentLyrics, container);
}

/* ---------------- TAP SYNC API (line-level) ---------------- */ 
function jukeboxStartLineTapSync() {
  if (!currentLyrics || !currentLyrics.length) return;
  _lineTapSyncActive = true;
  _lineTapIndex = 0;
  const sc = document.querySelector('.lyrics-scroll');
  if (sc) {
    sc.classList.add('line-tap-sync-active');
    if (!sc.id) sc.id = 'line-' + Date.now();
    recordTapForUndo({ domId: sc.id, className: 'line-tap-sync-active', time: Date.now() });
  }
}

function jukeboxRegisterLineTap(audioElement) {
  if (!_lineTapSyncActive) return;
  if (!audioElement) audioElement = document.querySelector('audio');
  if (!audioElement) return;
  if (_lineTapIndex >= currentLyrics.length) {
    jukeboxStopLineTapSync();
    return;
  }
  const t = Math.round(audioElement.currentTime * 1000) / 1000;
  currentLyrics[_lineTapIndex].seconds = t;
  _lineTapIndex++;
  if (_lineTapIndex >= currentLyrics.length) jukeboxStopLineTapSync();
}

function jukeboxStopLineTapSync() {
  _lineTapSyncActive = false;
  const sc = document.querySelector('.lyrics-scroll');
  if (sc) sc.classList.remove('line-tap-sync-active');
  currentLyrics.sort((a, b) => a.seconds - b.seconds);
  const container = document.querySelector('.jukebox-lyrics-window') || document.querySelector('.lyrics-scroll');
  if (container) renderLyrics(currentLyrics, container);
}

/* ---------------- MAIN LOAD FUNCTION ---------------- */
async function jukeboxLoadLyrics(lyricsPath, audioElement, containerElement) {
  initLyricsScrollUserListeners();
  const sc = resolveScrollContainer(containerElement);
  if (!sc) { console.error('jukeboxLoadLyrics aborted: invalid container'); return; }
  currentLyrics = await loadLyricsFile(lyricsPath);
  renderLyrics(currentLyrics, containerElement);
  if (!audioElement) { console.error('jukeboxLoadLyrics aborted: no audio element'); return; }
  if (audioElement._lyricsTimeUpdateHandler) {
    audioElement.removeEventListener('timeupdate', audioElement._lyricsTimeUpdateHandler);
    audioElement._lyricsTimeUpdateHandler = null;
  }
  audioElement._lyricsTimeUpdateHandler = function () { updateLyricsUIForJukebox(audioElement, containerElement); };
  audioElement.addEventListener('timeupdate', audioElement._lyricsTimeUpdateHandler);
}

/* ---------------- UNDO HELPER (single, consolidated) ---------------- */
window.undoBuffer = window.undoBuffer || { lastAction: null };

function recordTapForUndo(tapMeta) {
  window.undoBuffer.lastAction = tapMeta;
  const undoLink = document.getElementById('undo-inline');
  const undoBtn = document.getElementById('undo-last-tap');
  const tapTime = document.getElementById('tap-time');
  if (tapTime && tapMeta.time) tapTime.textContent = (tapMeta.time / 1000).toFixed(3) + 's';
  if (undoLink) undoLink.style.display = 'inline';
  if (undoBtn) undoBtn.style.display = 'inline-block';
}

function undoLastTap() {
  const action = window.undoBuffer.lastAction;
  if (!action) return;
  if (action.domId && action.className) {
    const el = document.getElementById(action.domId);
    if (el && el.classList) el.classList.remove(action.className);
  } else if (action.domId) {
    const el = document.getElementById(action.domId);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  } else {
    const container = document.querySelector('.line-container, .taps-container, #jukeboxLyrics');
    if (container && container.lastElementChild) container.removeChild(container.lastElementChild);
  }
  window.undoBuffer.lastAction = null;
  const undoLink = document.getElementById('undo-inline');
  const undoBtn = document.getElementById('undo-last-tap');
  const tapTime = document.getElementById('tap-time');
  if (undoLink) undoLink.style.display = 'none';
  if (undoBtn) undoBtn.style.display = 'none';
  if (tapTime) tapTime.textContent = '';
  if (typeof recalcTapDerivedState === 'function') recalcTapDerivedState();
}

/* ---------------- DOM READY: wire undo UI and shortcuts once ---------------- */
document.addEventListener('DOMContentLoaded', function () {
  const undoLink = document.getElementById('undo-inline');
  if (undoLink) undoLink.addEventListener('click', undoLastTap);
  const undoBtn = document.getElementById('undo-last-tap');
  if (undoBtn) undoBtn.addEventListener('click', undoLastTap);
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undoLastTap(); return; }
    if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'u') { undoLastTap(); }
  });
  const tapBtn = document.querySelector('.tap-btn.tap');
  if (tapBtn) {
    let pressTimer = null;
    tapBtn.addEventListener('touchstart', function () { pressTimer = setTimeout(undoLastTap, 700); }, { passive: true });
    tapBtn.addEventListener('touchend', function () { if (pressTimer) clearTimeout(pressTimer); }, { passive: true });
  }
});

/* ---------------- AUTO INIT ---------------- */
document.addEventListener('DOMContentLoaded', () => { initLyricsScrollUserListeners(); });
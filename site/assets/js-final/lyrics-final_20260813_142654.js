/* Safe, non-destructive lyrics module with line-only highlighting, click-to-seek,
   and simple line-level Tap Sync API (jukeboxStartLineTapSync, jukeboxRegisterLineTap, jukeboxStopLineTapSync).
   Local build: clean copy for deployment (v20260813)
*/

/* ---------------- GLOBALS ---------------- */
let currentLyrics = [];
let _lastActiveLineIndex = -1;
let _userScrolledAt = 0;
const USER_SCROLL_PAUSE_MS = 3000;

console.log('lyrics-final loaded: local-build v20260813');

 // Tap sync state
let _lineTapSyncActive = false;
let _lineTapIndex = 0;

/* ---------------- PARSE TIMESTAMP ---------------- */
function parseTimestamp(ts) {
  const m = ts && ts.match(/^

\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]

$/);
  if (!m) return NaN;
  const min = parseInt(m[1], 10),
        sec = parseInt(m[2], 10),
        frac = m[3] ? parseFloat('0.' + m[3]) : 0;
  return min * 60 + sec + frac;
}

/* ---------------- LOAD LYRICS FILE ---------------- */
async function loadLyricsFile(path) {
  try {
    const res = await fetch(path);
    const text = await res.text();
    const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // match [mm:ss(.ms)?] timestamps (global)
    const rx = new RegExp('\

\[(\\d{1,2}):(\\d{2})(?:\\.(\\d{1,3}))?\\]

', 'g');

    const out = [];
    let last = 0;
    for (let raw of rawLines) {
      const matches = raw.match(rx);
      let seconds = matches && matches.length ? parseTimestamp(matches[matches.length - 1]) : last + 0.001;
      if (Number.isNaN(seconds)) seconds = last + 0.001;
      let text = raw.replace(rx, '').trim().replace(/^<|>$/g, '').trim();
      out.push({ text, seconds });
      last = seconds;
    }

    return out
      .map(l => ({ text: l.text, seconds: Number.isFinite(l.seconds) ? l.seconds : 0 }))
      .sort((a, b) => a.seconds - b.seconds);
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
  try {
    const found = container.querySelector && container.querySelector('.lyrics-scroll');
    if (found) return found;
  } catch (e) { /* ignore */ }
  console.error('lyrics-final.js: .lyrics-scroll not found inside provided container');
  return null;
}

function createLineElement(line, index) {
  const d = document.createElement('div');
  d.dataset.line = index;
  d.className = 'lyrics-line';
  d.textContent = line.text || '';
  d.addEventListener('click', () => {
    const ev = new CustomEvent('lyrics-line-click', { detail: { index, seconds: line.seconds } });
    d.dispatchEvent(ev);
  });
  return d;
}

/* ---------------- RENDER ---------------- */
function renderLyrics(lyrics, container) {
  const sc = resolveScrollContainer(container);
  if (!sc) return;
  sc.innerHTML = '';
  sc.scrollTop = 0;
  _lastActiveLineIndex = -1;

  lyrics.forEach((line, i) => {
    const d = createLineElement(line, i);
    sc.appendChild(d);
  });
}

/* ---------------- HIGHLIGHT / SYNC ---------------- */
function highlightLine(index, container) {
  const sc = resolveScrollContainer(container);
  if (!sc) return;
  const prev = sc.querySelector('.lyrics-line.active');
  if (prev) prev.classList.remove('active');
  const el = sc.querySelector(`.lyrics-line[data-line="${index}"]`);
  if (el) {
    el.classList.add('active');
    _lastActiveLineIndex = index;
    // ensure visible
    const rect = el.getBoundingClientRect();
    const parentRect = sc.getBoundingClientRect();
    if (rect.top < parentRect.top || rect.bottom > parentRect.bottom) {
      // center the line in the scroll container
      sc.scrollTop = el.offsetTop - (sc.clientHeight / 2) + (el.clientHeight / 2);
      _userScrolledAt = Date.now();
    }
  }
}

/* ---------------- TAP SYNC API ---------------- */
function jukeboxStartLineTapSync(startIndex = 0) {
  _lineTapSyncActive = true;
  _lineTapIndex = startIndex;
  const ev = new CustomEvent('jukebox-line-tap-start', { detail: { index: _lineTapIndex } });
  document.dispatchEvent(ev);
}

function jukeboxRegisterLineTap() {
  if (!_lineTapSyncActive) return null;
  const index = _lineTapIndex++;
  const ev = new CustomEvent('jukebox-line-tap', { detail: { index } });
  document.dispatchEvent(ev);
  return index;
}

function jukeboxStopLineTapSync() {
  if (!_lineTapSyncActive) return;
  _lineTapSyncActive = false;
  const ev = new CustomEvent('jukebox-line-tap-stop', { detail: { lastIndex: _lineTapIndex - 1 } });
  document.dispatchEvent(ev);
}

/* ---------------- PUBLIC API ---------------- */
window.lyricsFinal = {
  load: async function(path, container) {
    currentLyrics = await loadLyricsFile(path);
    renderLyrics(currentLyrics, container);
    return currentLyrics;
  },
  highlight: function(index, container) {
    highlightLine(index, container);
  },
  startTapSync: jukeboxStartLineTapSync,
  registerTap: jukeboxRegisterLineTap,
  stopTapSync: jukeboxStopLineTapSync
};

/* ---------------- EXPORTS FOR MODULE SYSTEMS (optional) ---------------- */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseTimestamp,
    loadLyricsFile,
    renderLyrics,
    highlightLine,
    jukeboxStartLineTapSync,
    jukeboxRegisterLineTap,
    jukeboxStopLineTapSync
  };
}S
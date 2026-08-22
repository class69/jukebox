// Safe, non-destructive lyrics module with line-only highlighting, click-to-seek,
// and simple line-level Tap Sync API (jukeboxStartLineTapSync, jukeboxRegisterLineTap, jukeboxStopLineTapSync).

/* ---------------- GLOBALS ---------------- */
let currentLyrics = [];
let _lastActiveLineIndex = -1;
let _userScrolledAt = 0;
const USER_SCROLL_PAUSE_MS = 3000;
// Export currentLyrics as an .lrc file and trigger download
function downloadLyricsAsLRC(filename = 'lyrics-tapped.lrc') {
    if (!currentLyrics || !currentLyrics.length) { console.warn('No lyrics to export'); return; }
    const lines = currentLyrics.map(l => {
        const s = Number.isFinite(l.seconds) ? l.seconds : 0;
        const mm = String(Math.floor(s / 60)).padStart(2, '0');
        const ss = String(Math.floor(s % 60)).padStart(2, '0');
        const frac = Math.floor((s - Math.floor(s)) * 1000);
        const ms = frac ? '.' + String(frac).padStart(3, '0') : '';
        return `[${mm}:${ss}${ms}] ${l.text || ''}`;
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// Tap sync state
let _lineTapSyncActive = false;
let _lineTapIndex = 0;

/* ---------------- PARSE TIMESTAMP ---------------- */
function parseTimestamp(ts) {
    const m = ts && ts.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]$/);
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
        const rx = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
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
        // click-to-seek
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
    if (sc) sc.classList.add('line-tap-sync-active');
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
    // Re-sort and re-render so data-line attributes match new order
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

/* ---------------- AUTO INIT ---------------- */
document.addEventListener('DOMContentLoaded', () => { initLyricsScrollUserListeners(); });

// ---------------- Pause / Resume auto-highlight (small patch) ----------------
let _lyricsAutoPaused = false;

function pauseLyricsAuto() {
    _lyricsAutoPaused = true;
    // If you want immediate visual feedback, clear active highlight
    const sc = document.querySelector('.lyrics-scroll');
    if (sc) {
        sc.querySelectorAll('[data-line]').forEach(el => el.classList.remove('active-line'));
    }
}

function resumeLyricsAuto() {
    _lyricsAutoPaused = false;
    // Force an immediate update so highlight/scroll syncs to current time
    const audio = document.querySelector('audio');
    if (audio && audio._lyricsTimeUpdateHandler) {
        audio._lyricsTimeUpdateHandler();
    }
}

// Ensure the timeupdate path respects the pause flag
// Wrap the existing update function call by checking the flag
const _origUpdateLyricsUIForJukebox = updateLyricsUIForJukebox;
updateLyricsUIForJukebox = function (audio, container) {
    if (_lyricsAutoPaused) return;
    return _origUpdateLyricsUIForJukebox(audio, container);
};

// Wire pause/resume into the Tap API so Start/Stop control auto behavior
const _origStartTap = window.jukeboxStartLineTapSync || jukeboxStartLineTapSync;
const _origStopTap = window.jukeboxStopLineTapSync || jukeboxStopLineTapSync;

window.jukeboxStartLineTapSync = function () {
    pauseLyricsAuto();
    if (typeof _origStartTap === 'function') _origStartTap();
};

window.jukeboxStopLineTapSync = function () {
    if (typeof _origStopTap === 'function') _origStopTap();
    // After stopping, resume auto so the lyrics follow the audio again
    resumeLyricsAuto();
};

// Also export the helpers for debugging if you want to control them manually
window.pauseLyricsAuto = pauseLyricsAuto;
window.resumeLyricsAuto = resumeLyricsAuto;

// Export Tap Sync API to global window
window.jukeboxStartLineTapSync = window.jukeboxStartLineTapSync || jukeboxStartLineTapSync;
document.querySelector('.jukebox-lyrics-window')?.classList.add('line-tap-sync-active');
function jukeboxStartLineTapSync() {
    // existing logic that pauses auto
    pauseLyricsAuto && pauseLyricsAuto();
    // Visual cue on
    document.querySelector('.jukebox-lyrics-window')?.classList.add('line-tap-sync-active');
    // existing rest of function...
}

window.jukeboxRegisterLineTap = window.jukeboxRegisterLineTap || jukeboxRegisterLineTap;
document.querySelector('.jukebox-lyrics-window')?.classList.remove('line-tap-sync-active');

window.jukeboxStopLineTapSync = window.jukeboxStopLineTapSync || jukeboxStopLineTapSync;
function jukeboxStopLineTapSync() {
    // existing stop logic...
    resumeLyricsAuto && resumeLyricsAuto();
    // Visual cue off
    document.querySelector('.jukebox-lyrics-window')?.classList.remove('line-tap-sync-active');
}

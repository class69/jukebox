// File: lyrics-final.js
// Fixed: prevents jump-to-end on load and speeds up estimated per-word timings.

/* ---------------- GLOBALS ---------------- */
let currentLyrics = [];
let _lastActiveLineIndex = -1;
let _userScrolledAt = 0; // timestamp when user last scrolled
const USER_SCROLL_PAUSE_MS = 3000; // pause auto-scroll for 3s after user scroll

/* ---------------- PARSE TIMESTAMP ---------------- */
function parseTimestamp(ts) {
    const match = ts && ts.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]$/);
    if (!match) return NaN;
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const fraction = match[3] ? parseFloat("0." + match[3]) : 0;
    return minutes * 60 + seconds + fraction;
}

/* ---------------- LOAD LYRICS FILE ---------------- */
async function loadLyricsFile(path) {
    try {
        const res = await fetch(path);
        const text = await res.text();

        const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        const timestampRegexGlobal = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

        const lyrics = [];
        let lastTime = 0;

        for (let idx = 0; idx < rawLines.length; idx++) {
            const raw = rawLines[idx];
            const tsMatches = raw.match(timestampRegexGlobal);
            let seconds;

            if (tsMatches && tsMatches.length) {
                seconds = parseTimestamp(tsMatches[tsMatches.length - 1]);
                if (Number.isNaN(seconds)) seconds = lastTime + 0.001;
            } else {
                // No timestamp: give a tiny increment so lines don't collapse to 0
                seconds = lastTime + 0.001;
            }

            let textPart = raw.replace(timestampRegexGlobal, "").trim();
            textPart = textPart.replace(/^<|>$/g, "").trim();

            const words = textPart.length ? textPart.split(/\s+/).map(w => ({ w, seconds: undefined })) : [];

            lyrics.push({ text: textPart, timestamp: seconds, seconds, words });
            lastTime = seconds;
        }

        // Defensive sort
        return lyrics.sort((a, b) => a.seconds - b.seconds);
    } catch (e) {
        console.error("LRC load failed:", e);
        return [];
    }
}

/* ---------------- RENDER LYRICS ---------------- */
function renderLyrics(lyrics, container) {
    if (!container) return;
    container.innerHTML = "";
    container.scrollTop = 0;
    _lastActiveLineIndex = -1;

    lyrics.forEach((line, i) => {
        const lineDiv = document.createElement("div");
        lineDiv.dataset.line = i;
        lineDiv.className = "lyrics-line";

        line.words.forEach((word, j) => {
            const outer = document.createElement("span");
            outer.dataset.word = j;
            outer.className = "lyrics-word";

            const inner = document.createElement("span");
            inner.className = "word-text";
            inner.textContent = word.w + "\u00A0";

            outer.appendChild(inner);
            lineDiv.appendChild(outer);
        });

        container.appendChild(lineDiv);
    });
}

/* ---------------- USER SCROLL LISTENERS (ONE-TIME INIT) ---------------- */
function initLyricsScrollUserListeners() {
    if (initLyricsScrollUserListeners._inited) return;
    initLyricsScrollUserListeners._inited = true;

    const lyricsScrollEl = document.querySelector('.lyrics-scroll');
    if (!lyricsScrollEl) return;
    const markUserScroll = () => { _userScrolledAt = Date.now(); };
    lyricsScrollEl.addEventListener('wheel', markUserScroll, { passive: true });
    lyricsScrollEl.addEventListener('touchstart', markUserScroll, { passive: true });
    lyricsScrollEl.addEventListener('scroll', markUserScroll, { passive: true });
}

/* ---------------- AUTO SCROLL ---------------- */
function autoScrollLyrics(currentPlaybackTime, lyrics, container) {
    if (!container || !lyrics || !lyrics.length) return;

    // Guard: don't auto-scroll when playback time is essentially zero (page load)
    if (typeof currentPlaybackTime !== "number" || Number.isNaN(currentPlaybackTime)) return;
    if (currentPlaybackTime < 0.05) return; // small threshold to avoid jump on load

    let activeIndex = -1;
    for (let i = 0; i < lyrics.length; i++) {
        if (currentPlaybackTime >= lyrics[i].seconds) activeIndex = i;
        else break;
    }
    if (activeIndex === -1) return;

    // Respect recent user scroll
    if (Date.now() - _userScrolledAt < USER_SCROLL_PAUSE_MS) {
        _lastActiveLineIndex = activeIndex;
        highlightActiveLine(activeIndex, container);
        return;
    }

    // Only scroll when the active line changes
    if (activeIndex === _lastActiveLineIndex) {
        highlightActiveLine(activeIndex, container);
        return;
    }

    const lineElement = container.querySelector(`[data-line="${activeIndex}"]`);
    if (!lineElement) {
        _lastActiveLineIndex = activeIndex;
        return;
    }

    let offset = lineElement.offsetTop - container.clientHeight / 2 + lineElement.clientHeight / 2;
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    if (offset < 0) offset = 0;
    if (offset > maxScrollTop) offset = maxScrollTop;

    container.scrollTo({ top: offset, behavior: "smooth" });

    _lastActiveLineIndex = activeIndex;
    highlightActiveLine(activeIndex, container);
}

/* ---------------- HIGHLIGHT ACTIVE LINE ---------------- */
function highlightActiveLine(activeIndex, container) {
    if (!container) return;
    container.querySelectorAll("[data-line]").forEach(el => {
        el.classList.toggle("active-line", parseInt(el.dataset.line, 10) === activeIndex);
    });
}

/* ---------------- PER-WORD TIME ESTIMATION ---------------- */
function estimateWordTime(lyrics, lineIndex, wordIndex) {
    const line = lyrics[lineIndex];
    const start = line.seconds;
    const next = lyrics[lineIndex + 1];
    // If next exists, use gap; otherwise use a reasonable default window
    const gap = next ? Math.max(0.5, next.seconds - start) : 2.0;
    // per-word raw
    let perWord = gap / Math.max(1, line.words.length);
    // Cap per-word to reasonable bounds so highlight isn't too slow or too fast
    const MIN_PER_WORD = 0.06; // 60ms
    const MAX_PER_WORD = 0.6;  // 600ms
    if (perWord < MIN_PER_WORD) perWord = MIN_PER_WORD;
    if (perWord > MAX_PER_WORD) perWord = Math.min(MAX_PER_WORD, gap / Math.max(1, Math.floor(line.words.length / 2)));
    // Use mid-word trigger so the word lights up near its middle
    return start + perWord * (wordIndex + 0.5);
}

/* ---------------- KARAOKE WORD HIGHLIGHT ---------------- */
function highlightKaraokeWord(currentPlaybackTime, lyrics, container) {
    if (!container || !lyrics || !lyrics.length) return;

    let activeLine = -1;
    let activeWord = -1;

    for (let i = 0; i < lyrics.length; i++) {
        if (currentPlaybackTime >= lyrics[i].seconds) activeLine = i;
        else break;
    }
    if (activeLine === -1) return;

    const line = lyrics[activeLine];

    for (let j = 0; j < line.words.length; j++) {
        const wSeconds = (typeof line.words[j].seconds === "number")
            ? line.words[j].seconds
            : estimateWordTime(lyrics, activeLine, j);

        if (currentPlaybackTime >= wSeconds) activeWord = j;
        else break;
    }

    // Remove previous active classes inside container
    container.querySelectorAll('.lyrics-word.active-word, .lyrics-word.fill-animate').forEach(el => {
        el.classList.remove('active-word', 'fill-animate');
    });

    if (activeWord !== -1) {
        const selector = `[data-line="${activeLine}"] .lyrics-word[data-word="${activeWord}"]`;
        const el = container.querySelector(selector);
        if (el) el.classList.add('active-word', 'fill-animate');
    }
}

/* ---------------- TAP SYNC ---------------- */
let tapSyncActive = false;
let tapLineIndex = 0;
let tapWordIndex = 0;

function startTapSyncWords() {
    tapSyncActive = true;
    tapLineIndex = 0;
    tapWordIndex = 0;
}

function stopTapSyncWords() {
    tapSyncActive = false;
}

function normalizeSeconds(t) {
    return Math.round(t * 1000) / 1000;
}

function registerTapWord(currentPlaybackTime, lyrics) {
    if (!tapSyncActive) return;

    if (tapLineIndex >= lyrics.length) {
        stopTapSyncWords();
        return;
    }

    const line = lyrics[tapLineIndex];

    if (tapWordIndex >= line.words.length) {
        tapLineIndex++;
        tapWordIndex = 0;
        if (tapLineIndex >= lyrics.length) {
            stopTapSyncWords();
            return;
        }
    }

    const seconds = normalizeSeconds(currentPlaybackTime);
    line.words[tapWordIndex].seconds = seconds;

    tapWordIndex++;
}

/* ---------------- UPDATE UI ---------------- */
function updateLyricsUIForJukebox(audio, container) {
    if (!currentLyrics || !currentLyrics.length) return;
    const t = audio.currentTime;
    if (typeof t !== "number" || Number.isNaN(t)) return;
    autoScrollLyrics(t, currentLyrics, container);
    highlightKaraokeWord(t, currentLyrics, container);
}

/* ---------------- MAIN LOAD FUNCTION ---------------- */
async function jukeboxLoadLyrics(lyricsPath, audioElement, containerElement) {
    initLyricsScrollUserListeners();

    currentLyrics = await loadLyricsFile(lyricsPath);
    renderLyrics(currentLyrics, containerElement);

    if (audioElement._lyricsTimeUpdateHandler) {
        audioElement.removeEventListener("timeupdate", audioElement._lyricsTimeUpdateHandler);
        audioElement._lyricsTimeUpdateHandler = null;
    }

    audioElement._lyricsTimeUpdateHandler = function () {
        updateLyricsUIForJukebox(audioElement, containerElement);
    };

    audioElement.addEventListener("timeupdate", audioElement._lyricsTimeUpdateHandler);
}

/* ---------------- TAP SYNC HOOKS ---------------- */
function jukeboxStartWordTapSync() {
    if (!currentLyrics.length) return;
    startTapSyncWords();
}

function jukeboxRegisterWordTap(audioElement) {
    if (!currentLyrics.length) return;
    registerTapWord(audioElement.currentTime, currentLyrics);
}

/* ---------------- AUTO INIT ---------------- */
document.addEventListener('DOMContentLoaded', () => {
    initLyricsScrollUserListeners();
});
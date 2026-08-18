/* ---------------- TIMESTAMP PARSING ---------------- */
function parseTimestamp(timestamp) {
    const match = timestamp.match(/

    \[(\d{ 1, 2}): (\d{ 2}) (?: \.(\d{ 1, 3}))?\]

        /);
    if (!match) return 0;

    return (
        parseInt(match[1], 10) * 60 +
        parseInt(match[2], 10) +
        (match[3] ? parseInt(match[3].padEnd(3, "0"), 10) / 1000 : 0)
    );
}

function normalizeSeconds(sec) {
    return Math.max(0, Math.round(sec * 1000) / 1000);
}

function sortLyrics(lines) {
    return lines.sort((a, b) => a.seconds - b.seconds);
}

/* ---------------- GLOBAL STATE ---------------- */
let currentLyrics = [];
let tapSyncActive = false;
let tapLineIndex = 0;
let tapWordIndex = 0;

/* ---------------- LOAD LYRICS FILE ---------------- */
async function loadLyricsFile(path) {
    try {
        const res = await fetch(path);
        const text = await res.text();

        const lines = text
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0);

        const lyrics = lines.map(raw => {
            const tsMatch = raw.match(/

        \[[^\]

        ] +\]

/);
        const timestamp = tsMatch ? tsMatch[0] : "[0:00]";
        const seconds = parseTimestamp(timestamp);

        let textPart = raw.replace(timestamp, "").trim();
        textPart = textPart.replace(/^<|>$/g, "").trim();

        const words = textPart.split(/\s+/).map(w => ({
            w,
            seconds
        }));

        return {
            text: textPart,
            timestamp,
            seconds,
            words
        };
    });

    return sortLyrics(lyrics);
} catch (e) {
    console.error("LRC load failed:", e);
    return [];
}
}

/* ---------------- RENDER LYRICS ---------------- */
function renderLyrics(lyrics, container) {
    container.innerHTML = "";

    lyrics.forEach((line, i) => {
        const lineDiv = document.createElement("div");
        lineDiv.dataset.line = i;
        lineDiv.className = "lyrics-line";

        line.words.forEach((word, j) => {
            const span = document.createElement("span");
            span.dataset.word = j;
            span.textContent = word.w + " ";
            span.className = "lyrics-word";
            lineDiv.appendChild(span);
        });

        container.appendChild(lineDiv);
    });
}

/* ---------------- AUTO SCROLL ---------------- */
function autoScrollLyrics(currentPlaybackTime, lyrics, container) {
    let activeIndex = -1;

    for (let i = 0; i < lyrics.length; i++) {
        if (currentPlaybackTime >= lyrics[i].seconds) {
            activeIndex = i;
        } else break;
    }

    if (activeIndex === -1) return;

    const lineElement = container.querySelector(`[data-line="${activeIndex}"]`);
    if (!lineElement) return;

    const offset =
        lineElement.offsetTop -
        container.clientHeight / 2 +
        lineElement.clientHeight / 2;

    container.scrollTo({
        top: offset,
        behavior: "smooth"
    });

    highlightActiveLine(activeIndex, container);
}

/* ---------------- HIGHLIGHT ACTIVE LINE ---------------- */
function highlightActiveLine(activeIndex, container) {
    container.querySelectorAll("[data-line]").forEach(el => {
        el.classList.toggle("active-line", parseInt(el.dataset.line, 10) === activeIndex);
    });
}

/* ---------------- KARAOKE WORD HIGHLIGHT ---------------- */
function highlightKaraokeWord(currentPlaybackTime, lyrics, container) {
    let activeLine = -1;
    let activeWord = -1;

    for (let i = 0; i < lyrics.length; i++) {
        if (currentPlaybackTime >= lyrics[i].seconds) {
            activeLine = i;
        } else break;
    }

    if (activeLine === -1) return;

    const line = lyrics[activeLine];

    for (let j = 0; j < line.words.length; j++) {
        if (currentPlaybackTime >= line.words[j].seconds) {
            activeWord = j;
        } else break;
    }

    container.querySelectorAll(".lyrics-word").forEach(el => {
        el.classList.remove("active-word", "fill-animate");
    });

    if (activeWord !== -1) {
        const el = container.querySelector(
            `[data-line="${activeLine}"] [data-word="${activeWord}"]`
        );
        if (el) el.classList.add("active-word", "fill-animate");
    }
}

/* ---------------- TAP SYNC ---------------- */
function startTapSyncWords(lyrics) {
    tapSyncActive = true;
    tapLineIndex = 0;
    tapWordIndex = 0;
}

function stopTapSyncWords() {
    tapSyncActive = false;
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
    if (!currentLyrics.length) return;
    const t = audio.currentTime;
    autoScrollLyrics(t, currentLyrics, container);
    highlightKaraokeWord(t, currentLyrics, container);
}

/* ---------------- MAIN LOAD FUNCTION ---------------- */
async function jukeboxLoadLyrics(lyricsPath, audioElement, containerElement) {
    currentLyrics = await loadLyricsFile(lyricsPath);
    renderLyrics(currentLyrics, containerElement);

    audioElement.addEventListener("timeupdate", () => {
        updateLyricsUIForJukebox(audioElement, containerElement);
    });
}

/* ---------------- TAP SYNC HOOKS ---------------- */
function jukeboxStartWordTapSync() {
    if (!currentLyrics.length) return;
    startTapSyncWords(currentLyrics);
}

function jukeboxRegisterWordTap(audioElement) {
    if (!currentLyrics.length) return;
    registerTapWord(audioElement.currentTime, currentLyrics);
}
// ---------- SONG BUILDER: RAW → LRC ----------

// Accepts either:
// 1) rawLyrics = array of { seconds, text }
// 2) rawLyrics = array of plain text lines (no timestamps)

async function buildSongLRC(songId, rawLyrics) {
  // Normalize input
  const normalized = normalizeRawLyrics(rawLyrics);

  // Add word timing for karaoke
  const withWords = addWordTiming(normalized);

  // Build LRC text
  const lrcString = buildLRC(withWords);

  // Save file
  saveLRCFile(songId, lrcString);

  return lrcString;
}

// ---------- Normalize raw lyrics ----------
// If user provides plain text lines, assign timestamps automatically.
// If timestamps exist, parse them.

function normalizeRawLyrics(rawLyrics) {
  return rawLyrics.map((item, index) => {
    // Case 1: item is { seconds, text }
    if (typeof item === "object" && "seconds" in item) {
      return {
        seconds: normalizeSeconds(item.seconds),
        text: item.text
      };
    }

    // Case 2: item is plain text
    const text = String(item).trim();

    // Auto-generate timestamps: 3 seconds apart
    const seconds = index * 3;

    return {
      seconds,
      text
    };
  });
}

// ---------- Add word timing ----------
// Each word gets a timestamp slightly after the previous one.
// Tap-sync will refine these later.

function addWordTiming(lyricsArray) {
  return lyricsArray.map(line => {
    const words = line.text.split(/\s+/);

    line.words = words.map((w, i) => ({
      w,
      seconds: line.seconds + i * 0.30 // 300ms spacing
    }));

    return line;
  });
}

// ---------- Build LRC ----------
// Output format: [MM:SS.mmm] <Lyric>

function buildLRC(lyricsArray) {
  return lyricsArray
    .map(item => {
      const ts = toTimestamp(item.seconds);
      const line = `<${item.text}>`;
      return `${ts} ${line}`;
    })
    .join("\n");
}

// ---------- Save LRC file ----------
// Browser-side download (JS)

function saveLRCFile(songId, lrcString) {
  const blob = new Blob([lrcString], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${songId}.lrc`;
  a.click();
}

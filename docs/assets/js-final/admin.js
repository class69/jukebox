// Upload handler
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);

  const res = await fetch('admin-api/upload.php', {
    method: 'POST',
    body: formData
  });

  const text = await res.text();
  document.getElementById('uploadStatus').textContent = text;
});

// Rebuild songs.json
document.getElementById('rebuildBtn').addEventListener('click', async () => {
  const res = await fetch('admin-api/rebuild.php');
  const text = await res.text();
  document.getElementById('rebuildStatus').textContent = text;
});

// Lyrics Manager
async function loadLyricsList() {
  const res = await fetch('data/songs.json');
  const songs = await res.json();

  const select = document.getElementById('lyricsSelect');
  select.innerHTML = '';

  songs.forEach(song => {
    const opt = document.createElement('option');
    opt.value = song.lyricsFile;
    opt.textContent = song.title;
    select.appendChild(opt);
  });
}

document.getElementById('lyricsSelect').addEventListener('change', async () => {
  const file = document.getElementById('lyricsSelect').value;
  const res = await fetch(file);
  const text = await res.text();
  document.getElementById('lyricsEditor').value = text;
});

// Save lyrics
document.getElementById('saveLyricsBtn').addEventListener('click', async () => {
  const file = document.getElementById('lyricsSelect').value;
  const text = document.getElementById('lyricsEditor').value;

  const res = await fetch('admin-api/upload.php?lyricsOnly=' + file, {
    method: 'POST',
    body: text
  });

  document.getElementById('lyricsStatus').textContent = await res.text();
});

// Auto‑timestamp (AI-assisted)
document.getElementById('timestampBtn').addEventListener('click', () => {
  const editor = document.getElementById('lyricsEditor');
  const lines = editor.value.split('\n');

  let timestamped = [];
  let seconds = 0;

  lines.forEach(line => {
    timestamped.push(`[00:${String(seconds).padStart(2, '0')}] ${line}`);
    seconds += 5;
  });

  editor.value = timestamped.join('\n');
});

document.addEventListener('DOMContentLoaded', loadLyricsList);

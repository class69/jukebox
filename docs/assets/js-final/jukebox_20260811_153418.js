let jukeboxSongs = [];
let currentIndex = -1;
let recentPlays = [];

/* ---------------- LOAD SONG DATA ---------------- */
async function loadJukeboxData() {
  const res = await fetch('data/songs.json');
  jukeboxSongs = await res.json();
}

/* ---------------- WHEEL ---------------- */
function renderWheel() {
  const wheel = document.getElementById('jukeboxWheel');
  wheel.innerHTML = '';

  jukeboxSongs.forEach((song, index) => {
    const item = document.createElement('div');
    item.className = 'wheel-item';
    item.dataset.index = index;

    item.innerHTML = `
      <div class="wheel-vinyl">
        <div class="wheel-label">${song.title}</div>
      </div>
    `;

    item.addEventListener('click', () => selectSong(index));
    wheel.appendChild(item);
  });
}

/* ---------------- DRAWER ---------------- */
function buildSongList(songs) {
  const list = document.getElementById('jukeboxLibrary');
  list.innerHTML = '';

  songs.forEach((song, index) => {
    const item = document.createElement('div');
    item.className = 'song-item';
    item.addEventListener('click', () => selectSong(index));

    const cover = document.createElement('div');
    cover.className = 'song-cover';
    cover.style.backgroundImage = `url(${song.albumCover || 'assets/img/default-cover.png'})`;

    const info = document.createElement('div');
    info.className = 'song-info';

    const title = document.createElement('div');
    title.className = 'song-title';
    title.textContent = song.title;

    const track = document.createElement('div');
    track.className = 'song-track';
    track.textContent = `Track ${song.trackNumber}`;

    info.appendChild(title);
    info.appendChild(track);

    item.appendChild(cover);
    item.appendChild(info);

    list.appendChild(item);
  });
}

/* ---------------- MARQUEE ---------------- */
function updateMarquee(song) {
  document.getElementById('jukeboxNowTitle').textContent = song.title;
  updateMarqueeCover(song);
}

/* ---------------- MARQUEE COVER ---------------- */
function updateMarqueeCover(song) {
  const cover = document.getElementById('jukeboxNowCover');
  cover.style.backgroundImage = `url(${song.albumCover || 'assets/img/default-cover.png'})`;
  cover.classList.add('active');
}

/* ---------------- VIDEO THUMBNAIL ---------------- */
function updateVideoThumbnail(song) {
  const thumb = document.getElementById('jukeboxVideoThumb');
  if (!thumb) return;

  if (song.videoFile) {
    const base = song.videoFile.replace('.mp4', '');
    thumb.style.backgroundImage = `url(${base}-thumb.jpg)`;
  } else {
    thumb.style.backgroundImage = `url(${song.albumCover || 'assets/img/default-cover.png'})`;
  }

  thumb.style.display = 'block';
}

/* ---------------- SELECT SONG ---------------- */
function selectSong(index) {
  currentIndex = index;
  const song = jukeboxSongs[index];
  const audio = document.getElementById('jukeboxAudio');
  const lyricsContainer = document.querySelector('.lyrics-scroll');
;

  audio.src = song.file;
  audio.load();

  audio.currentTime = 0;   // ⭐ Reset BEFORE loading lyrics

  updateMarquee(song);
  updateVideoThumbnail(song);

  jukeboxLoadLyrics(song.lyricsFile, audio, lyricsContainer);  // ⭐ Now safe

  addRecent(song);

  audio.play();
  updatePlayButton(true);
}

/* ---------------- RECENT ---------------- */
function addRecent(song) {
  recentPlays.unshift(song);
  if (recentPlays.length > 10) recentPlays.pop();
  renderRecent();
}

function renderRecent() {
  const container = document.getElementById('jukeboxRecent');
  container.innerHTML = '';

  recentPlays.forEach(s => {
    const row = document.createElement('div');
    row.className = 'recent-item';
    row.textContent = s.title;
    container.appendChild(row);
  });
}

/* ---------------- CONTROLS ---------------- */
function updatePlayButton(isPlaying) {
  const btn = document.getElementById('jukeboxPlayPause');
  btn.textContent = isPlaying ? 'Pause' : 'Play';
}

function setupControls() {
  const audio = document.getElementById('jukeboxAudio');

  document.getElementById('jukeboxPlayPause').addEventListener('click', () => {
    if (!audio.src) return;

    if (audio.paused) {
      audio.play();
      updatePlayButton(true);
    } else {
      audio.pause();
      updatePlayButton(false);
    }
  });

  document.getElementById('jukeboxPrev').addEventListener('click', () => {
    if (currentIndex > 0) selectSong(currentIndex - 1);
  });

  document.getElementById('jukeboxNext').addEventListener('click', () => {
    if (currentIndex < jukeboxSongs.length - 1) selectSong(currentIndex + 1);
  });

  audio.addEventListener('ended', () => updatePlayButton(false));
}

/* ---------------- SEARCH ---------------- */
function setupSearch() {
  const search = document.getElementById('jukeboxSearch');
  const lib = document.getElementById('jukeboxLibrary');

  search.addEventListener('input', () => {
    const q = search.value.toLowerCase();
    lib.innerHTML = '';

    jukeboxSongs
      .filter(s => s.title.toLowerCase().includes(q))
      .forEach((song, index) => {
        const row = document.createElement('button');
        row.className = 'library-item';
        row.textContent = `#${song.trackNumber} – ${song.title}`;
        row.addEventListener('click', () => selectSong(index));
        lib.appendChild(row);
      });
  });
}

/* ---------------- TAP-SYNC CONTROLS ---------------- */
function setupTapSyncControls() {
  const audio = document.getElementById("jukeboxAudio");
  const lyricsContainer = document.querySelector(".lyrics-scroll");
;

  lyricsContainer.addEventListener("dblclick", () => {
    jukeboxStartWordTapSync();
  });

  lyricsContainer.addEventListener("click", () => {
    jukeboxRegisterWordTap(audio);
  });
}

/* ---------------- INIT ---------------- */
document.addEventListener('DOMContentLoaded', async () => {
  if (!document.querySelector('.jukebox-layout')) return;

  await loadJukeboxData();
  renderWheel();
  buildSongList(jukeboxSongs);
  setupControls();
  setupSearch();
  setupTapSyncControls();
});
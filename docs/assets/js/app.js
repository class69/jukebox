const STORAGE = {
  favorites: 'class69Favorites',
  recent: 'class69Recent',
  plays: 'class69Plays',
  theme: 'class69Theme',
  continuous: 'class69Continuous'
};

function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

async function fetchSongs() {
  const response = await fetch('data/songs.json', { cache: 'no-store' });
  return response.json();
}

function getJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function setJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function wireTheme() {
  const button = document.getElementById('themeToggle');
  if (!button) return;
  if (localStorage.getItem(STORAGE.theme) === 'paper') document.body.classList.add('paper');
  button.addEventListener('click', () => {
    document.body.classList.toggle('paper');
    localStorage.setItem(STORAGE.theme, document.body.classList.contains('paper') ? 'paper' : 'juke');
  });
}

function rememberRecent(id) {
  let recent = getJSON(STORAGE.recent, []).filter(x => x !== id);
  recent.unshift(id);
  setJSON(STORAGE.recent, recent.slice(0, 10));
}

function addPlay(id) {
  const plays = getJSON(STORAGE.plays, {});
  plays[id] = (plays[id] || 0) + 1;
  setJSON(STORAGE.plays, plays);
}

async function loadHome() {
  const songs = await fetchSongs();
  const list = document.getElementById('songList');
  const search = document.getElementById('searchBox');
  const sort = document.getElementById('sortSelect');
  const continuous = document.getElementById('continuousToggle');
  const plays = getJSON(STORAGE.plays, {});

  if (continuous) {
    continuous.checked = localStorage.getItem(STORAGE.continuous) === 'true';
    continuous.onchange = () => localStorage.setItem(STORAGE.continuous, continuous.checked);
  }

  function render(items) {
    list.innerHTML = items.map(song => `
      <a class="song-item" href="song.html?id=${encodeURIComponent(song.id)}">
        <span class="song-track">Track ${song.trackNumber}</span>
        <span class="song-title">${song.title}</span>
        <span class="song-meta">${song.mood || 'Growing older, memory, friendship, and the blues'} · Plays: ${plays[song.id] || 0}</span>
      </a>
    `).join('') || '<p>No songs found.</p>';
  }

  function filtered() {
    const query = (search.value || '').toLowerCase();
    let output = songs.filter(song => (song.title + ' ' + (song.keywords || []).join(' ')).toLowerCase().includes(query));

    if (sort.value === 'title') output.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort.value === 'popular') output.sort((a, b) => (plays[b.id] || 0) - (plays[a.id] || 0));
    else if (sort.value === 'recent') output.sort((a, b) => (b.added || '').localeCompare(a.added || ''));
    else output.sort((a, b) => a.trackNumber - b.trackNumber);

    render(output);
  }

  search.oninput = filtered;
  sort.onchange = filtered;
  filtered();

  document.getElementById('shuffleBtn')?.addEventListener('click', () => {
    if (!songs.length) return;
    const song = songs[Math.floor(Math.random() * songs.length)];
    location.href = `song.html?id=${song.id}`;
  });

  document.getElementById('continueBtn')?.addEventListener('click', () => {
    const recent = getJSON(STORAGE.recent, []);
    if (recent[0]) location.href = `song.html?id=${recent[0]}`;
    else alert('No recent songs yet.');
  });
}

async function loadSong() {
  const id = getParam('id');
  const songs = await fetchSongs();
  const index = songs.findIndex(song => song.id === id);
  if (index < 0) return;

  const song = songs[index];
  rememberRecent(id);
  addPlay(id);

  document.title = `${song.title} | Class of 69`;
  document.getElementById('songTitle').textContent = song.title;
  document.getElementById('songMood').textContent = song.mood || 'The Delta Blues of Growing Older';

  const audio = document.getElementById('audioPlayer');
  audio.src = song.file;

  const downloadLyrics = document.getElementById('downloadLyrics');
  if (song.lyricsFile) {
    downloadLyrics.href = song.lyricsFile;
    loadSyncedLyrics(song.lyricsFile, audio);
  } else {
    document.getElementById('lyricsContainer').textContent = 'Lyrics have not been added yet.';
  }

  const video = document.getElementById('songVideo');
  const missing = document.getElementById('videoMissing');
  if (song.videoFile) {
    video.src = song.videoFile;
    missing.hidden = true;
  } else {
    video.hidden = true;
    missing.hidden = false;
  }

  const prev = document.getElementById('prevSongBtn');
  const next = document.getElementById('nextSongBtn');
  prev.disabled = index === 0;
  next.disabled = index === songs.length - 1;
  prev.onclick = () => index > 0 && (location.href = `song.html?id=${songs[index - 1].id}`);
  next.onclick = () => index < songs.length - 1 && (location.href = `song.html?id=${songs[index + 1].id}`);

  audio.addEventListener('ended', () => {
    if (localStorage.getItem(STORAGE.continuous) === 'true' && index < songs.length - 1) {
      location.href = `song.html?id=${songs[index + 1].id}`;
    }
  });

  const favorite = document.getElementById('favoriteBtn');
  function updateFavorite() {
    const favorites = getJSON(STORAGE.favorites, []);
    favorite.textContent = favorites.includes(id) ? '? Favorite' : '? Favorite';
  }
  favorite.onclick = () => {
    let favorites = getJSON(STORAGE.favorites, []);
    favorites = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id];
    setJSON(STORAGE.favorites, favorites);
    updateFavorite();
  };
  updateFavorite();

  document.getElementById('fontInc').onclick = () => changeLyricsSize(2);
  document.getElementById('fontDec').onclick = () => changeLyricsSize(-2);
}

function changeLyricsSize(delta) {
  const container = document.getElementById('lyricsContainer');
  const current = parseInt(getComputedStyle(container).fontSize) || 22;
  container.style.setProperty('--lyrics-size', Math.max(18, Math.min(36, current + delta)) + 'px');
}

document.addEventListener('DOMContentLoaded', () => {
  wireTheme();
  if (document.getElementById('songList')) loadHome();
  if (document.getElementById('audioPlayer')) loadSong();
});

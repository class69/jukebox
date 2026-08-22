// Minimal jukebox controller that wires audio, track list, and the lyrics module.
// It also injects simple on-screen Tap Sync controls that call the lyrics module API.

document.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('jukeboxAudio');
  const nowPlayingTitle = document.getElementById('nowPlayingTitle');
  const trackList = document.getElementById('trackList');
  const lyricsContainer = document.querySelector('.jukebox-lyrics-window');
  const controlsHost = document.getElementById('lyricsControls');

  // Load first track by default
  const firstTrack = trackList.querySelector('li[data-src]');
  if (firstTrack) {
    const src = firstTrack.dataset.src;
    audio.src = src;
    nowPlayingTitle.textContent = firstTrack.textContent.trim();
  }

  // Click-to-load track from library
  trackList.addEventListener('click', (ev) => {
    const li = ev.target.closest('li[data-src]');
    if (!li) return;
    audio.src = li.dataset.src;
    nowPlayingTitle.textContent = li.textContent.trim();
    audio.play().catch(() => { });
  });

  // Initialize lyrics if the lyrics module is available
  if (typeof jukeboxLoadLyrics === 'function') {
    // Pass the wrapper (jukebox-lyrics-window) so the module can find .lyrics-scroll inside it
    jukeboxLoadLyrics('lyrics/disgracefully.lrc', audio, lyricsContainer);
  } else {
    console.warn('jukebox.js: jukeboxLoadLyrics not found.');
  }

  // Build Tap Sync UI
  const startBtn = document.createElement('button');
  startBtn.className = 'tap-btn';
  startBtn.textContent = 'Start Tap Sync';

  const tapBtn = document.createElement('button');
  tapBtn.className = 'tap-btn primary';
  tapBtn.textContent = 'Tap';
  tapBtn.disabled = true;

  const stopBtn = document.createElement('button');
  stopBtn.className = 'tap-btn';
  stopBtn.textContent = 'Stop';
  stopBtn.disabled = true;

  const status = document.createElement('div');
  status.className = 'tap-status';
  status.textContent = 'Tap sync inactive';

  controlsHost.appendChild(startBtn);
  controlsHost.appendChild(tapBtn);
  controlsHost.appendChild(stopBtn);
  controlsHost.appendChild(status);

  let tapActive = false;

  startBtn.addEventListener('click', () => {
    if (typeof jukeboxStartLineTapSync === 'function') {
      jukeboxStartLineTapSync();
      tapActive = true;
      tapBtn.disabled = false;
      stopBtn.disabled = false;
      startBtn.disabled = true;
      status.textContent = 'Tap sync active — press Tap as each line begins';
    } else {
      alert('Tap sync not available.');
    }
  });

  tapBtn.addEventListener('click', () => {
    if (!tapActive) return;
    if (typeof jukeboxRegisterLineTap === 'function') {
      jukeboxRegisterLineTap(audio);
      status.textContent = 'Registered tap at ' + (Math.round(audio.currentTime * 1000) / 1000) + 's';
    }
  });

  stopBtn.addEventListener('click', () => {
    if (!tapActive) return;
    if (typeof jukeboxStopLineTapSync === 'function') jukeboxStopLineTapSync();
    tapActive = false;
    tapBtn.disabled = true;
    stopBtn.disabled = true;
    startBtn.disabled = false;
    status.textContent = 'Tap sync stopped';
  });

  // Keyboard shortcut: press T to register a tap when tap sync active
  document.addEventListener('keydown', (ev) => {
    if (ev.key.toLowerCase() === 't' && !tapBtn.disabled) {
      jukeboxRegisterLineTap(audio);
      status.textContent = 'Registered tap at ' + (Math.round(audio.currentTime * 1000) / 1000) + 's';
    }
  });
});
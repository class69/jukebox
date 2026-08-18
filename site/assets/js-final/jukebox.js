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
    jukeboxLoadLyrics('/assets/lyrics/disgracefully.lrc', audio, lyricsContainer);
  } else {
    console.warn('jukebox.js: jukeboxLoadLyrics not found.');
  }

  // Defensive Tap Sync UI initializer
  (function initTapSyncUI() {
    const controlsHost = document.getElementById('lyricsControls') || (function () {
      const wrapper = document.querySelector('.jukebox-lyrics-window');
      if (!wrapper) return null;
      const h = document.createElement('div'); h.id = 'lyricsControls'; wrapper.appendChild(h); return h;
    })();
    if (!controlsHost) {
      console.warn('Tap UI: #lyricsControls not found');
      return;
    }

    function makeBtn(text, className) {
      const b = document.createElement('button');
      b.className = className || 'tap-btn';
      b.textContent = text;
      return b;
    }

    let startBtn = controlsHost.querySelector('.tap-btn.start') || makeBtn('Start Tap Sync', 'tap-btn start');
    let tapBtn = controlsHost.querySelector('.tap-btn.tap') || makeBtn('Tap', 'tap-btn tap primary');
    let stopBtn = controlsHost.querySelector('.tap-btn.stop') || makeBtn('Stop', 'tap-btn stop');
    let status = controlsHost.querySelector('.tap-status') || (function () { const s = document.createElement('div'); s.className = 'tap-status'; s.textContent = 'Tap sync inactive'; return s; })();

    if (!controlsHost.contains(startBtn)) controlsHost.appendChild(startBtn);
    if (!controlsHost.contains(tapBtn)) controlsHost.appendChild(tapBtn);
    if (!controlsHost.contains(stopBtn)) controlsHost.appendChild(stopBtn);
    if (!controlsHost.contains(status)) controlsHost.appendChild(status);

    tapBtn.disabled = true;
    stopBtn.disabled = true;
    startBtn.disabled = false;

    function resolveApis() {
      return {
        startApi: window.jukeboxStartLineTapSync || function () { console.warn('jukeboxStartLineTapSync missing'); },
        registerApi: window.jukeboxRegisterLineTap || function () { console.warn('jukeboxRegisterLineTap missing'); },
        stopApi: window.jukeboxStopLineTapSync || function () { console.warn('jukeboxStopLineTapSync missing'); }
      };
    }

    startBtn.addEventListener('click', () => {
      const { startApi } = resolveApis();
      try {
        startApi();
        startBtn.disabled = true;
        tapBtn.disabled = false;
        stopBtn.disabled = false;
        status.textContent = 'Tap sync active — press Tap or press T';
        console.log('Tap sync started');
      } catch (err) {
        console.error('Tap start failed', err);
        status.textContent = 'Tap sync failed to start';
      }
    });

    tapBtn.addEventListener('click', () => {
      const { registerApi } = resolveApis();
      try {
        registerApi(document.querySelector('audio'));
        status.textContent = 'Tap registered at ' + (Math.round((document.querySelector('audio')?.currentTime || 0) * 1000) / 1000) + 's';
        console.log('Tap registered', document.querySelector('audio')?.currentTime);
      } catch (err) {
        console.error('Tap register failed', err);
        status.textContent = 'Tap failed';
      }
    });

    stopBtn.addEventListener('click', () => {
      const { stopApi } = resolveApis();
      try {
        stopApi();
        tapBtn.disabled = true;
        stopBtn.disabled = true;
        startBtn.disabled = false;
        status.textContent = 'Tap sync stopped';
        console.log('Tap sync stopped');
      } catch (err) {
        console.error('Tap stop failed', err);
        status.textContent = 'Tap stop failed';
      }
    });

    document.addEventListener('keydown', (ev) => {
      if (ev.key.toLowerCase() === 't' && !tapBtn.disabled) {
        ev.preventDefault();
        tapBtn.click();
      }
    });

    window.__jukeboxTapUI = { startBtn, tapBtn, stopBtn, status };

    if (!window.jukeboxRegisterLineTap || !window.jukeboxStartLineTapSync) {
      let tries = 0;
      const poll = setInterval(() => {
        tries++;
        if (window.jukeboxRegisterLineTap && window.jukeboxStartLineTapSync) {
          clearInterval(poll);
          console.log('Tap API detected — UI ready');
        } else if (tries > 20) {
          clearInterval(poll);
          console.warn('Tap API not detected after waiting; UI will still function when APIs load.');
        }
      }, 200);
    }
  })();
  // create export button and wire to download function
  const exportBtn = controlsHost.querySelector('.tap-btn.export') || (function () { const b = document.createElement('button'); b.className = 'tap-btn export'; b.textContent = 'Export .lrc'; controlsHost.appendChild(b); return b; })();
  exportBtn.addEventListener('click', () => { if (typeof downloadLyricsAsLRC === 'function') downloadLyricsAsLRC(); else alert('Export not available'); });



});
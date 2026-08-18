<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Jukebox</title>
 <link rel="stylesheet" href="/assets/css/style.css" />


</head>
<body>
  <header class="site-header">
    <h1>Jukebox</h1>
  </header>

  <main class="site-main">
    <section class="library">
      <h2>Library</h2>
      <ul id="trackList">
        <li data-src="/assets/audio/disgracefully.mp3">Disgracefully</li>
      </ul>
    </section>

    <section class="now-playing">
      <h2>Now Playing</h2>
      <div id="nowPlayingTitle">—</div>
      <audio id="jukeboxAudio" controls preload="metadata"></audio>
    </section>

    <section class="jukebox-lyrics-window">
      <h2>Lyrics</h2>
      <div class="lyrics-glass">
        <div id="jukeboxLyrics" class="lyrics-scroll" aria-live="polite"></div>
      </div>

      <!-- Tap sync controls will be injected here by jukebox.js -->
      <div id="lyricsControls" class="lyrics-controls"></div>
    </section>
  </main>

  <footer class="site-footer">
    <small>Jukebox demo</small>
  </footer>

<script src="/assets/js-final/lyrics-final.js"></script>
<script src="/assets/js-final/jukebox.js"></script>

<!-- Undo last tap button -->
<button id="undo-last-tap" style="display:none; margin-left:8px;">Undo last tap</button>

</body>
</html>
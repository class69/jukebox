// Run from inside /69 with: node tools/songBuilder.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const songsDir = path.join(root, 'songs');
const lyricsDir = path.join(root, 'lyrics');
const videosDir = path.join(root, 'videos');
const outputFile = path.join(root, 'data', 'songs.json');

function titleFromBase(base) {
  return base
    .replace(/^\d+[-_ ]*/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function build() {
  const mp3s = fs.readdirSync(songsDir)
    .filter(file => file.toLowerCase().endsWith('.mp3'))
    .sort((a, b) => a.localeCompare(b));

  const lyricFiles = fs.existsSync(lyricsDir) ? fs.readdirSync(lyricsDir) : [];
  const videoFiles = fs.existsSync(videosDir) ? fs.readdirSync(videosDir) : [];

  const songs = mp3s.map((file, index) => {
    const base = file.replace(/\.mp3$/i, '');
    const lyric = [`${base}.txt`, `${base}-lyrics.txt`, `${base}.lrc`].find(name => lyricFiles.includes(name));
    const video = [`${base}.mp4`, `${base}.webm`].find(name => videoFiles.includes(name));

    return {
      id: String(index + 1).padStart(3, '0'),
      title: titleFromBase(base),
      trackNumber: index + 1,
      file: `songs/${file}`,
      lyricsFile: lyric ? `lyrics/${lyric}` : null,
      videoFile: video ? `videos/${video}` : null,
      mood: 'The Delta Blues of Growing Older',
      keywords: ['oldtimer', 'aging', 'memory', 'limitations', 'friendship'],
      added: new Date().toISOString().slice(0, 10)
    };
  });

  fs.writeFileSync(outputFile, JSON.stringify(songs, null, 2));
  console.log(`Updated ${outputFile} with ${songs.length} songs.`);
}

build();
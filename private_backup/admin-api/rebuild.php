<?php
$songsDir = "../songs/";
$videosDir = "../videos/";
$dataFile = "../data/songs.json";

$songs = [];
$files = scandir($songsDir);

$mp3s = array_filter($files, fn($f) => strtolower(pathinfo($f, PATHINFO_EXTENSION)) === "mp3");

$index = 1;
foreach ($mp3s as $mp3) {

    $base = pathinfo($mp3, PATHINFO_FILENAME);
    $lyrics = $base . ".txt";
    $video = $base . ".mp4";

    // Vinyl label detection
    $vinylPng = "../artwork/vinyl/" . $base . "-label.png";
    $vinylJpg = "../artwork/vinyl/" . $base . "-label.jpg";

    $vinylPath = null;
    if (file_exists($vinylPng)) $vinylPath = "artwork/vinyl/" . $base . "-label.png";
    if (file_exists($vinylJpg)) $vinylPath = "artwork/vinyl/" . $base . "-label.jpg";

    // Album cover detection
    $albumCoverPng = "../artwork/albums/" . $base . "-cover.png";
    $albumCoverJpg = "../artwork/albums/" . $base . "-cover.jpg";

    $coverPath = null;
    if (file_exists($albumCoverPng)) $coverPath = "artwork/albums/" . $base . "-cover.png";
    if (file_exists($albumCoverJpg)) $coverPath = "artwork/albums/" . $base . "-cover.jpg";

    // Build song entry
    $songs[] = [
        "id" => str_pad($index, 3, "0", STR_PAD_LEFT),
        "title" => ucwords(str_replace("-", " ", $base)),
        "trackNumber" => $index,
        "file" => "songs/" . $mp3,
        "lyricsFile" => file_exists($songsDir . $lyrics) ? "songs/" . $lyrics : null,
        "videoFile" => file_exists($videosDir . $video) ? "videos/" . $video : null,
        "vinylLabel" => $vinylPath,
        "albumCover" => $coverPath
    ];

    $index++;
}

file_put_contents($dataFile, json_encode($songs, JSON_PRETTY_PRINT));

echo "songs.json rebuilt successfully!";
?>

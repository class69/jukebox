<?php
$uploadDirSongs  = "../songs/";
$uploadDirVideos = "../videos/";
$uploadDirVinyl  = "../artwork/vinyl/";
$uploadDirAlbums = "../artwork/albums/";

// Ensure directories exist
foreach ([$uploadDirSongs, $uploadDirVideos, $uploadDirVinyl, $uploadDirAlbums] as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
}

// Helper: sanitize filenames
function safeName($name) {
    return preg_replace("/[^A-Za-z0-9._-]/", "_", $name);
}

// MP3 upload
if (!empty($_FILES['mp3'])) {
    $name = safeName($_FILES['mp3']['name']);
    move_uploaded_file($_FILES['mp3']['tmp_name'], $uploadDirSongs . $name);
}

// Lyrics upload
if (!empty($_FILES['lyrics'])) {
    $name = safeName($_FILES['lyrics']['name']);
    move_uploaded_file($_FILES['lyrics']['tmp_name'], $uploadDirSongs . $name);
}

// Video upload
if (!empty($_FILES['video'])) {
    $name = safeName($_FILES['video']['name']);
    move_uploaded_file($_FILES['video']['tmp_name'], $uploadDirVideos . $name);
}

// Vinyl label upload
if (!empty($_FILES['vinylLabel'])) {
    $name = safeName($_FILES['vinylLabel']['name']);
    move_uploaded_file($_FILES['vinylLabel']['tmp_name'], $uploadDirVinyl . $name);
}

// Album cover upload
if (!empty($_FILES['albumCover'])) {
    $name = safeName($_FILES['albumCover']['name']);
    move_uploaded_file($_FILES['albumCover']['tmp_name'], $uploadDirAlbums . $name);
}

echo "Upload complete!";
?>

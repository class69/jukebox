<?php
require_once '../config.php';

$count = $pdo->query(
    "SELECT COUNT(*) FROM songs"
)->fetchColumn();
?>
<!DOCTYPE html>
<html>
<head>
    <title>Class of 69 Dashboard</title>
</head>
<body>

<h1>Class of 69 Dashboard</h1>

<p>Total songs: <?php echo $count; ?></p>

<hr>

<p>
    <a href="upload.php">
        Upload Song
    </a>
</p>

<p>
    <a href="manage-songs.php">
        Manage Songs
    </a>
</p>

</body>
</html>
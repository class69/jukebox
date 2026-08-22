<?php
require_once '../config.php';

$message = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $title = trim($_POST['title'] ?? '');

    if ($title && isset($_FILES['song_file'])) {

        $songName = basename($_FILES['song_file']['name']);

        move_uploaded_file(
            $_FILES['song_file']['tmp_name'],
            '../songs/' . $songName
        );

        $slug = slugify($title);

        $stmt = $pdo->prepare("
            INSERT INTO songs
            (title, slug, song_file)
            VALUES (?, ?, ?)
        ");

        $stmt->execute([
            $title,
            $slug,
            $songName
        ]);

        $message = 'Song uploaded successfully.';
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Upload Song</title>
</head>
<body>

<h1>Upload Song</h1>

<?php if($message): ?>
<p style="color:green;">
    <?php echo $message; ?>
</p>
<?php endif; ?>

<form method="post" enctype="multipart/form-data">

    <p>
        Song Title<br>
        <input type="text"
               name="title"
               required>
    </p>

    <p>
        MP3 File<br>
        <input type="file"
               name="song_file"
               accept=".mp3"
               required>
    </p>

    <p>
        <button type="submit">
            Upload Song
        </button>
    </p>

</form>

<p>
dashboard.php
Back to Dashboard
</a>
</p>

</body>
</html>
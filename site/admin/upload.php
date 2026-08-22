<?php
require_once '../config.php';

$message = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $title = trim($_POST['title'] ?? '');

    if ($title && isset($_FILES['song_file']) && $_FILES['song_file']['error'] === 0) {

        $originalName = basename($_FILES['song_file']['name']);
        $safeName = preg_replace('/[^a-zA-Z0-9 ._-]/', '', $originalName);

        $targetPath = '../songs/' . $safeName;

        if (move_uploaded_file($_FILES['song_file']['tmp_name'], $targetPath)) {

            $slug = strtolower(trim($title));
            $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
            $slug = trim($slug, '-');

            $stmt = $pdo->prepare("
                INSERT INTO songs
                (title, slug, song_file)
                VALUES (?, ?, ?)
            ");

try {

    $stmt->execute([
        $title,
        $slug,
        $safeName
    ]);

    $message = 'Song uploaded and added to database.';
    
    
    

} catch (Exception $e) {

    echo '<pre>';
    echo $e->getMessage();
    echo '</pre>';
}

            $message = 'Song uploaded and added to database.';

        } else {
            $message = 'File upload failed while moving file.';
        }

    } else {
        $message = 'Missing title or file upload error.';
    }
}
?>

<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Upload Song</title>
</head>
<body>

<h1>Upload Song</h1>

<?php if ($message): ?>
    <p>
        <?php echo htmlspecialchars($message); ?>
    </p>
<?php endif; ?>

<form method="post" enctype="multipart/form-data">

    <p>
        Song Title<br>
        <input type="text" name="title" required>
    </p>

    <p>
        MP3 File<br>
        <input type="file" name="song_file" accept=".mp3,audio/mpeg" required>
    </p>

    <p>
        <button type="submit">
            Upload Song
        </button>
    </p>

</form>

<p>
    <a href="dashboard.php">Back to Dashboard</a>
</p>

</body>
</html>
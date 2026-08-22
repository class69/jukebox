<?php
require_once '../config.php';

$id = intval($_GET['id'] ?? 0);

$stmt = $pdo->prepare("SELECT * FROM songs WHERE id = ?");
$stmt->execute([$id]);
$song = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$song) {
    die("Song not found.");
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $storyboard = "
AI Storyboard for: " . $song['title'] . "

Theme:
A 1930s–1940s Mississippi Delta Blues story about aging, memory, friendship, limitations, humor, reflection, and the road already traveled.

Visual Style:
Sepia tones, film grain, aged paper, worn wood, old guitars, front porches, country roads, riverbanks, trains, small churches, and warm sunset light.

Scene 1:
An older person sitting on a wooden porch at sunset, reflecting on life.

Scene 2:
A dusty country road stretching toward the horizon.

Scene 3:
A weathered acoustic guitar leaning against an old chair.

Scene 4:
Friends from long ago gathered in memory, soft sepia light.

Scene 5:
A Mississippi river scene with slow-moving water and evening fog.

Scene 6:
A train disappearing into the distance, symbolizing time passing.

Scene 7:
Old hands resting on a cane or guitar, showing age and wisdom.

Scene 8:
A small country church or town street at dusk.

Scene 9:
Autumn leaves blowing across an empty road.

Scene 10:
A peaceful porch-light ending, warm, hopeful, and reflective.

Video Direction:
Create a slow Ken Burns-style slideshow using these images. Use gentle zooms, fades, film grain, and warm Delta Blues atmosphere. Do not show modern concert footage. Do not name contributors.
";

    $update = $pdo->prepare("UPDATE songs SET storyboard = ? WHERE id = ?");
    $update->execute([$storyboard, $id]);

    $song['storyboard'] = $storyboard;
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>Storyboard Generator</title>
</head>
<body>

<h1>AI Storyboard Generator</h1>

<h2><?php echo htmlspecialchars($song['title']); ?></h2>

<form method="post">
    <button type="submit">Generate Storyboard</button>
</form>

<hr>

<?php if (!empty($song['storyboard'])): ?>
    <h3>Generated Storyboard</h3>
    <pre><?php echo htmlspecialchars($song['storyboard']); ?></pre>
<?php endif; ?>

<p>
    dashboard.phpBack to Dashboard</a>
</p>

</body>
</html>
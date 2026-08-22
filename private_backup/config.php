<?php
session_start();

$db_host = 'localhost';
$db_name = 'wwmarke_class69';
$db_user = 'wwmarke_class69admin';
$db_pass = '19mountaineers69!';

try {
    $pdo = new PDO(
        "mysql:host=$db_host;dbname=$db_name;charset=utf8mb4",
        $db_user,
        $db_pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    die('Database connection failed: ' . $e->getMessage());
}

function require_admin() {
    if (empty($_SESSION['admin_logged_in'])) {
        header('Location: /69/admin/login.php');
        exit;
    }
}

function slugify($text) {
    $text = strtolower(trim($text));
    $text = preg_replace('/[^a-z0-9]+/', '-', $text);
    return trim($text, '-');
}
?>
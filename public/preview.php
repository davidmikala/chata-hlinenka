<?php
declare(strict_types=1);
const PREVIEW_HASH = '0a84411124ad324271c6baa6ffba4f0aff1ee90d04f9a4aecc0569c087a1102a';
header('X-Robots-Tag: noindex, nofollow, noarchive');
header('Cache-Control: private, no-store, max-age=0');
header('Referrer-Policy: no-referrer');
header('X-Content-Type-Options: nosniff');
function validToken($token): bool {
    return is_string($token) && hash_equals(PREVIEW_HASH, hash('sha256', $token));
}
if (validToken($_GET['nahled'] ?? null)) {
    setcookie('hlinenka_preview', $_GET['nahled'], [
        'expires' => time() + 30 * 86400,
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    header('Location: /', true, 303);
    exit;
}
if (!validToken($_COOKIE['hlinenka_preview'] ?? null)) {
    http_response_code(503);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="cs"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Chata Hliněnka – připravujeme</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#faf8f3;color:#183e30;font:18px/1.6 Georgia,serif;text-align:center}main{padding:32px}h1{font-weight:normal}</style><main><h1>Chata Hliněnka</h1><p>Web pro vás právě připravujeme.</p></main></html>';
    exit;
}
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');
if ($path === '/' || $path === '/index.html' || $path === '/preview.php') {
    $path = '/index.html';
}
$root = realpath(__DIR__);
$file = realpath(__DIR__ . $path);
$types = [
    'html' => 'text/html; charset=utf-8',
    'js' => 'application/javascript; charset=utf-8',
    'css' => 'text/css; charset=utf-8',
    'webp' => 'image/webp',
    'png' => 'image/png',
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'svg' => 'image/svg+xml',
    'ico' => 'image/x-icon',
    'woff' => 'font/woff',
    'woff2' => 'font/woff2',
];
$extension = strtolower(pathinfo($file ?: '', PATHINFO_EXTENSION));
$allowedPath = $path === '/index.html' || $path === '/favicon.webp' || strpos($path, '/assets/') === 0;
if (!$allowedPath || !$file || !is_file($file) || strpos($file, $root . DIRECTORY_SEPARATOR) !== 0 || !isset($types[$extension])) {
    http_response_code(404);
    exit;
}
header('Content-Type: ' . $types[$extension]);
header('Content-Length: ' . filesize($file));
if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') {
    readfile($file);
}

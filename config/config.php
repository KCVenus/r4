<?php
// ── Chargement du fichier .env (développement local) ─────────────────────
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $val] = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($val);
    }
}

return [
    'db_host'    => $_ENV['DB_HOST']    ?? getenv('DB_HOST')    ?: 'localhost',
    'db_name'    => $_ENV['DB_NAME']    ?? getenv('DB_NAME')    ?: 'r4_survey',
    'db_user'    => $_ENV['DB_USER']    ?? getenv('DB_USER')    ?: 'root',
    'db_pass'    => $_ENV['DB_PASS']    ?? getenv('DB_PASS')    ?: '',
    'db_charset' => $_ENV['DB_CHARSET'] ?? getenv('DB_CHARSET') ?: 'utf8mb4',
];

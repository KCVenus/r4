<?php
// ── Load .env file (local development convenience) ───────────────────────
// In production the variables should come from the real environment
// (Apache SetEnv, systemd, Docker). The .env path is only a dev shortcut.
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        // Skip blank lines and "# comments"; require an "=" separator.
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $val] = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($val);
    }
}

// Each config value: try $_ENV first, then getenv(), then fall back to a
// sensible local default. Using both $_ENV and getenv() covers different
// SAPIs/servers that expose variables differently.
return [
    'db_host'    => $_ENV['DB_HOST']    ?? getenv('DB_HOST')    ?: 'localhost',
    'db_name'    => $_ENV['DB_NAME']    ?? getenv('DB_NAME')    ?: 'r4_survey',
    'db_user'    => $_ENV['DB_USER']    ?? getenv('DB_USER')    ?: 'root',
    'db_pass'    => $_ENV['DB_PASS']    ?? getenv('DB_PASS')    ?: '',
    'db_charset' => $_ENV['DB_CHARSET'] ?? getenv('DB_CHARSET') ?: 'utf8mb4',
];

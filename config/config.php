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

// Tiny helper: read a config value from $_ENV, then getenv(), then a default.
// Both lookups are needed because some SAPIs only populate one of the two.
$cfg = static fn (string $key, string $default = ''): string =>
    (string)($_ENV[$key] ?? getenv($key) ?: $default);

return [
    'db_host'    => $cfg('DB_HOST',    'localhost'),
    'db_name'    => $cfg('DB_NAME',    'r4_survey'),
    'db_user'    => $cfg('DB_USER',    'root'),
    'db_pass'    => $cfg('DB_PASS'),
    'db_charset' => $cfg('DB_CHARSET', 'utf8mb4'),
];

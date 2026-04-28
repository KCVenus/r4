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

    // SMTP — empty SMTP_USER/PASS means "mail disabled", the controller
    // will return a clean 503 instead of pretending the message was sent.
    'smtp_host'      => $cfg('SMTP_HOST', 'ssl0.ovh.net'),
    'smtp_port'      => (int)$cfg('SMTP_PORT', '465'),
    'smtp_user'      => $cfg('SMTP_USER'),
    'smtp_pass'      => $cfg('SMTP_PASS'),
    'smtp_from_name' => $cfg('SMTP_FROM_NAME', "R4 — Test d'orientation"),
    'mail_fallback_to' => $cfg('MAIL_FALLBACK_TO', 'contact@ohvenus.fr'),
];

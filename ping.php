<?php
/**
 * Health-check endpoint used by monitoring tools and deploy scripts.
 *
 * Returns a JSON object with a fixed `ok` flag plus the PHP version and
 * document root, which help diagnose environment mismatches without
 * exposing anything sensitive.
 *
 * Expected response: { "ok": true, "php": "8.x.y", "path": "/var/www/..." }
 */
header('Content-Type: application/json');
echo json_encode(['ok' => true, 'php' => PHP_VERSION, 'path' => __DIR__]);

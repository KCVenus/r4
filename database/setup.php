<?php
/**
 * r4 Survey — First-run setup
 * Run ONCE after importing schema.sql:
 *   - Via browser: http://localhost/r4/database/setup.php
 *   - Via CLI:     php database/setup.php
 *
 * Creates default users: user/user and admin/admin
 * Safe to re-run (uses INSERT IGNORE).
 */

require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/db.php';

header('Content-Type: text/plain; charset=utf-8');

$defaults = [
    ['username' => 'user',  'password' => 'user',  'role' => 'user'],
    ['username' => 'admin', 'password' => 'admin', 'role' => 'admin'],
];

try {
    $pdo = db();

    foreach ($defaults as $u) {
        $hash = password_hash($u['password'], PASSWORD_DEFAULT);
        $stmt = $pdo->prepare(
            'INSERT IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)'
        );
        $stmt->execute([$u['username'], $hash, $u['role']]);
        $label = $stmt->rowCount() ? 'Created' : 'Already exists';
        echo "{$label}: {$u['username']} (role: {$u['role']})\n";
    }

    echo "\nSetup complete. You can now log in at /login.html\n";
    echo "Delete or protect this file after first use.\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Make sure you imported schema.sql first and that config.php has the correct DB credentials.\n";
}

<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
/**
 * r4 Survey — First-run setup
 * Run ONCE after importing schema.sql:
 *   - Via browser: http://localhost/r4/database/setup.php
 *   - Via CLI:     php database/setup.php
 *
 * Creates default users: user/user and admin/admin
 * Safe to re-run (uses INSERT IGNORE).
 */

require_once __DIR__ . '/../app/Core/Database.php';

use App\Core\Database;

header('Content-Type: text/plain; charset=utf-8');

// Default seed accounts created on first run. The password is stored as a
// bcrypt hash (password_hash), never in plaintext.
$defaultUsers = [
    ['username' => 'user',  'password' => 'user',  'role' => 'user'],
    ['username' => 'admin', 'password' => 'admin', 'role' => 'admin'],
];

try {
    $pdo = Database::getInstance();

    foreach ($defaultUsers as $userSpec) {
        $hash = password_hash($userSpec['password'], PASSWORD_DEFAULT);
        // INSERT IGNORE makes this script idempotent: re-running it skips
        // accounts that already exist (unique username constraint).
        $stmt = $pdo->prepare(
            'INSERT IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)'
        );
        $stmt->execute([$userSpec['username'], $hash, $userSpec['role']]);
        // rowCount() == 1 -> inserted; 0 -> row was already there.
        $label = $stmt->rowCount() ? 'Créé' : 'Déjà existant';
        echo "{$label} : {$userSpec['username']} (rôle : {$userSpec['role']})\n";
    }

    echo "\nSetup terminé. Vous pouvez vous connecter sur /login.html\n";
    echo "Supprimez ou protégez ce fichier après utilisation.\n";

} catch (\PDOException $e) {
    echo "Erreur : " . $e->getMessage() . "\n";
    echo "Assurez-vous d'avoir importé schema.sql et que config/config.php est correct.\n";
}

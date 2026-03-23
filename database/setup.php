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

$defaults = [
    ['username' => 'user',  'password' => 'user',  'role' => 'user'],
    ['username' => 'admin', 'password' => 'admin', 'role' => 'admin'],
];

try {
    $pdo = Database::getInstance();

    foreach ($defaults as $u) {
        $hash = password_hash($u['password'], PASSWORD_DEFAULT);
        $stmt = $pdo->prepare(
            'INSERT IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)'
        );
        $stmt->execute([$u['username'], $hash, $u['role']]);
        $label = $stmt->rowCount() ? 'Créé' : 'Déjà existant';
        echo "{$label} : {$u['username']} (rôle : {$u['role']})\n";
    }

    echo "\nSetup terminé. Vous pouvez vous connecter sur /login.html\n";
    echo "Supprimez ou protégez ce fichier après utilisation.\n";

} catch (\PDOException $e) {
    echo "Erreur : " . $e->getMessage() . "\n";
    echo "Assurez-vous d'avoir importé schema.sql et que config/config.php est correct.\n";
}

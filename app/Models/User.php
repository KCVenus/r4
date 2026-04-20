<?php
namespace App\Models;

use App\Core\Database;

class User
{
    public static function findByUsername(string $username): array|false
    {
        $stmt = Database::getInstance()->prepare(
            'SELECT id, username, password_hash, role FROM users WHERE username = ?'
        );
        $stmt->execute([$username]);
        return $stmt->fetch();
    }

    public static function create(string $username, string $passwordHash, ?string $email = null): int
    {
        $pdo = Database::getInstance();
        $pdo->prepare(
            'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, "user")'
        )->execute([$username, $email, $passwordHash]);

        return (int) $pdo->lastInsertId();
    }
}

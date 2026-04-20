<?php
namespace App\Models;

use App\Core\Database;

/**
 * User model — thin wrapper around the `users` table.
 *
 * Only two operations are exposed: lookup by username (used by login) and
 * account creation (used by register).
 */
class User
{
    /**
     * Find a user by their unique username.
     *
     * @param string $username Exact username, case-sensitive per MySQL collation.
     * @return array|false     Row as associative array, or false if no match.
     */
    public static function findByUsername(string $username): array|false
    {
        $stmt = Database::getInstance()->prepare(
            'SELECT id, username, password_hash, role FROM users WHERE username = ?'
        );
        $stmt->execute([$username]);
        return $stmt->fetch();
    }

    /**
     * Insert a new user with the default "user" role.
     *
     * Caller must hash the password beforehand (this class stays storage-only).
     *
     * @param string      $username     Validated username.
     * @param string      $passwordHash Output of password_hash().
     * @param string|null $email        Optional email, already validated.
     * @return int                      Auto-increment id of the new row.
     */
    public static function create(string $username, string $passwordHash, ?string $email = null): int
    {
        $pdo = Database::getInstance();
        $pdo->prepare(
            'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, "user")'
        )->execute([$username, $email, $passwordHash]);

        return (int) $pdo->lastInsertId();
    }
}

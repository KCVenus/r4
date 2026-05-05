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
     * `consent_at` is set to CURRENT_TIMESTAMP so the row carries an audit
     * trail of when the user accepted the privacy policy at signup.
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
            'INSERT INTO users (username, email, password_hash, role, consent_at)
             VALUES (?, ?, ?, "user", CURRENT_TIMESTAMP)'
        )->execute([$username, $email, $passwordHash]);

        return (int) $pdo->lastInsertId();
    }

    /**
     * Hard-delete a user. Survey responses + answers are removed via
     * ON DELETE CASCADE on `survey_responses.user_id` (cf. install.sql).
     * Created tests get their `created_by` nulled (SET NULL FK).
     *
     * @param int $id User id.
     */
    public static function deleteById(int $id): void
    {
        Database::getInstance()
            ->prepare('DELETE FROM users WHERE id = ?')
            ->execute([$id]);
    }

    /**
     * Export every piece of personal data we hold for one user, used by the
     * GDPR "right to portability" endpoint (GET /me/export).
     *
     * Layout:
     *   {
     *     account:        { id, username, email, role, created_at, consent_at },
     *     survey_runs:    [{ id, user_level, completed_at,
     *                        answers: [{ question_key, question_text,
     *                                    chosen_value, chosen_label }] }, ...]
     *   }
     *
     * @param int $id User id.
     * @return array  Self-contained, JSON-serialisable payload.
     */
    public static function exportPersonalData(int $id): array
    {
        $pdo = Database::getInstance();

        $stmt = $pdo->prepare(
            'SELECT id, username, email, role, created_at, consent_at
             FROM   users WHERE id = ?'
        );
        $stmt->execute([$id]);
        $account = $stmt->fetch() ?: [];

        $runStmt = $pdo->prepare(
            'SELECT id, user_level, completed_at
             FROM   survey_responses WHERE user_id = ?
             ORDER  BY completed_at'
        );
        $runStmt->execute([$id]);
        $runs = $runStmt->fetchAll();

        $ansStmt = $pdo->prepare(
            'SELECT question_key, question_text, chosen_value, chosen_label
             FROM   response_answers WHERE response_id = ?
             ORDER  BY id'
        );
        foreach ($runs as &$run) {
            $ansStmt->execute([$run['id']]);
            $run['answers'] = $ansStmt->fetchAll();
        }
        unset($run);

        return [
            'account'     => $account,
            'survey_runs' => $runs,
        ];
    }
}

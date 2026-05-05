<?php
namespace App\Controllers;

use App\Core\Response;
use App\Models\User;

/**
 * Authentication controller — handles login / register / logout.
 *
 * The POST /auth endpoint is multiplexed through the `action` body field
 * rather than separate routes, to keep CSRF handling simple in api/index.php.
 */
class AuthController
{
    /**
     * GET /auth — return the currently authenticated user, or 401 if none.
     *
     * Consumed by both app.js (to decide whether to show login CTAs) and
     * admin.js (as an auth guard before loading admin screens).
     */
    public function me(): void
    {
        if (!isset($_SESSION['user_id'])) {
            Response::error('Non authentifié', 401);
        }

        Response::json([
            'id'       => $_SESSION['user_id'],
            'username' => $_SESSION['username'],
            'role'     => $_SESSION['role'],
        ]);
    }

    /**
     * POST /auth — dispatcher on the `action` field.
     *
     * Supported actions: "login", "register", "logout".
     * Unknown actions return a 400 error.
     */
    public function handle(): void
    {
        $body   = json_decode(file_get_contents('php://input'), true) ?? [];
        $action = $body['action'] ?? '';

        match ($action) {
            'login'    => $this->login($body),
            'register' => $this->register($body),
            'logout'   => $this->logout(),
            default    => Response::error('Action inconnue'),
        };
    }

    /**
     * Verify credentials, start the session, apply per-session rate limiting.
     *
     * Rate limit: 5 failed attempts per session; after that, the session is
     * locked for 5 minutes (HTTP 429). Tied to the session cookie rather
     * than IP so it survives behind a shared NAT / proxy.
     *
     * @param array $body Decoded JSON request body.
     */
    private function login(array $body): void
    {
        // Rate limiting — stored in the session so it persists across requests.
        $rateLimit = $_SESSION['_auth_rl'] ?? ['count' => 0, 'until' => 0];
        if ($rateLimit['until'] > time()) {
            Response::error('Trop de tentatives. Réessayez dans 5 minutes.', 429);
            return;
        }

        $username = trim($body['username'] ?? '');
        $password = $body['password']      ?? '';

        if (!$username || !$password) {
            Response::error('Identifiants requis');
        }

        $user = User::findByUsername($username);

        // Same generic error for "no such user" and "wrong password" to avoid
        // leaking which usernames exist.
        if (!$user || !password_verify($password, $user['password_hash'])) {
            $rateLimit['count']++;
            // After 5 failed attempts, lock out for 5 minutes and reset the counter (was 10 before, reduced to 5 for better security).
            if ($rateLimit['count'] >= 5) {
                // Lock out for 5 minutes, then reset the counter.
                $rateLimit['until'] = time() + 300;
                $rateLimit['count'] = 0;
            }
            $_SESSION['_auth_rl'] = $rateLimit;
            Response::error('Identifiant ou mot de passe incorrect', 401);
            return;
        }

        unset($_SESSION['_auth_rl']);

        // Regenerate the id on privilege change to defeat session fixation.
        session_regenerate_id(true);
        $_SESSION['user_id']  = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role']     = $user['role'];

        Response::json([
            'id'       => $user['id'],
            'username' => $user['username'],
            'role'     => $user['role'],
        ]);
    }

    /**
     * Create a new account and immediately log the user in.
     *
     * Validation mirrors the UI constraints (min 3 chars username, min 4
     * chars password) so a malicious client cannot bypass the HTML5 rules.
     *
     * @param array $body Decoded JSON request body.
     */
    private function register(array $body): void
    {
        $username = trim($body['username'] ?? '');
        $password = $body['password']      ?? '';
        $email    = trim($body['email']    ?? '') ?: null;

        // Whitelist: letters, digits, underscore, 3 to 50 chars. No spaces, no dots.
        if (!preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username)) {
            Response::error('Nom d\'utilisateur invalide (3-50 car. : lettres, chiffres, _)');
        }

        if (strlen($password) < 4) {
            Response::error('Mot de passe trop court (4 caractères minimum)');
        }

        if ($email !== null && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Adresse email invalide');
        }

        // GDPR: explicit consent to the privacy policy is mandatory at signup.
        // The frontend ships a checkbox but a hostile client could still POST
        // without it — reject with 422 so the client surfaces a clear error.
        if (empty($body['consent'])) {
            Response::error('Vous devez accepter la politique de confidentialité', 422);
        }

        try {
            $userId = User::create($username, password_hash($password, PASSWORD_DEFAULT), $email);
        } catch (\PDOException $e) {
            // MySQL SQLSTATE 23000 = integrity constraint violation
            // (duplicate username/email given the UNIQUE keys in schema.sql).
            if ($e->getCode() === '23000') {
                Response::error('Nom d\'utilisateur déjà pris', 409);
            }
            Response::error('Erreur lors de l\'inscription', 500);
        }

        // Fresh account -> new privilege level -> regenerate id.
        session_regenerate_id(true);
        $_SESSION['user_id']  = $userId;
        $_SESSION['username'] = $username;
        $_SESSION['role']     = 'user';

        Response::json(['id' => $userId, 'username' => $username, 'role' => 'user']);
    }

    /**
     * Destroy the session entirely. Frontend then redirects to login.
     */
    private function logout(): void
    {
        session_destroy();
        Response::json(['ok' => true]);
    }

    /**
     * DELETE /me — GDPR right to erasure.
     *
     * Hard-deletes the user row; survey responses + answers cascade away
     * via the ON DELETE CASCADE FK. Tests created by the user keep
     * existing (created_by FK SET NULL) so a coordinator's work isn't
     * destroyed with their account.
     *
     * Session is destroyed afterwards so the client can redirect to login.
     */
    public function deleteMe(): void
    {
        if (!isset($_SESSION['user_id'])) {
            Response::error('Non authentifié', 401);
        }

        User::deleteById((int) $_SESSION['user_id']);
        session_destroy();
        Response::json(['ok' => true]);
    }

    /**
     * GET /me/export — GDPR right to data portability.
     *
     * Returns a JSON file containing every personal record we hold for
     * the user: account row + survey runs + per-run answers. The browser
     * triggers a download via Content-Disposition: attachment.
     */
    public function exportMe(): void
    {
        if (!isset($_SESSION['user_id'])) {
            Response::error('Non authentifié', 401);
        }

        $payload = User::exportPersonalData((int) $_SESSION['user_id']);

        // Override the JSON header set in api/index.php with a download
        // header so the browser saves the file rather than showing it.
        header('Content-Type: application/json; charset=utf-8', true);
        header('Content-Disposition: attachment; filename="r4-export-' . date('Ymd_His') . '.json"');
        echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }
}

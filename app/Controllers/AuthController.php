<?php
namespace App\Controllers;

use App\Core\Response;
use App\Models\User;

class AuthController
{
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

    private function login(array $body): void
    {
        $username = trim($body['username'] ?? '');
        $password = $body['password']      ?? '';

        if (!$username || !$password) {
            Response::error('Identifiants requis');
        }

        $user = User::findByUsername($username);

        if (!$user || !password_verify($password, $user['password_hash'])) {
            Response::error('Identifiant ou mot de passe incorrect', 401);
        }

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

    private function register(array $body): void
    {
        $username = trim($body['username'] ?? '');
        $password = $body['password']      ?? '';

        if (!preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username)) {
            Response::error('Nom d\'utilisateur invalide (3-50 car. : lettres, chiffres, _)');
        }

        if (strlen($password) < 4) {
            Response::error('Mot de passe trop court (4 caractères minimum)');
        }

        try {
            $userId = User::create($username, password_hash($password, PASSWORD_DEFAULT));
        } catch (\PDOException $e) {
            if ($e->getCode() === '23000') {
                Response::error('Nom d\'utilisateur déjà pris', 409);
            }
            Response::error('Erreur lors de l\'inscription', 500);
        }

        session_regenerate_id(true);
        $_SESSION['user_id']  = $userId;
        $_SESSION['username'] = $username;
        $_SESSION['role']     = 'user';

        Response::json(['id' => $userId, 'username' => $username, 'role' => 'user']);
    }

    private function logout(): void
    {
        session_destroy();
        Response::json(['ok' => true]);
    }
}

<?php
ini_set('display_errors', 0);
error_reporting(0);

// ── Flags de sécurité session ─────────────────────────────────────────────
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Lax');
if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
    ini_set('session.cookie_secure', 1);
}

header('Content-Type: application/json');
session_start();

// ── Autoload ──────────────────────────────────────────────────────────────
$base = __DIR__ . '/../app';
require_once $base . '/Core/Database.php';
require_once $base . '/Core/Response.php';
require_once $base . '/Models/User.php';
require_once $base . '/Models/Question.php';
require_once $base . '/Models/Formation.php';
require_once $base . '/Models/Survey.php';
require_once $base . '/Controllers/AuthController.php';
require_once $base . '/Controllers/QuestionController.php';
require_once $base . '/Controllers/RecommendController.php';
require_once $base . '/Controllers/AnswerController.php';
require_once $base . '/Controllers/StatsController.php';

use App\Core\Response;
use App\Controllers\{AuthController, QuestionController, RecommendController, AnswerController, StatsController};

// ── Router ────────────────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$route  = trim($_GET['_route'] ?? '', '/');

// ── Vérification CSRF sur les routes POST sensibles ───────────────────────
$csrfProtected = [['POST', 'auth'], ['POST', 'answers']];
if (in_array([$method, $route], $csrfProtected, true)) {
    $clientToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    if (!$clientToken || !$sessionToken || !hash_equals($sessionToken, $clientToken)) {
        Response::error('Token CSRF invalide', 403);
        exit;
    }
}

try {
    match ([$method, $route]) {
        ['GET',  'csrf']      => (function () {
            if (empty($_SESSION['csrf_token'])) {
                $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            }
            Response::json(['token' => $_SESSION['csrf_token']]);
        })(),
        ['GET',  'auth']      => (new AuthController())->me(),
        ['POST', 'auth']      => (new AuthController())->handle(),
        ['GET',  'questions'] => (new QuestionController())->index(),
        ['POST', 'recommend'] => (new RecommendController())->recommend(),
        ['GET',  'answers']   => (new AnswerController())->last(),
        ['POST', 'answers']   => (new AnswerController())->store(),
        ['GET',  'stats']     => (new StatsController())->index(),
        default               => Response::error('Route introuvable', 404),
    };
} catch (\PDOException) {
    Response::error('Erreur base de données', 500);
} catch (\Throwable) {
    Response::error('Erreur serveur', 500);
}

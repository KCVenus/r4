<?php
// Production posture: hide errors from clients, log them server-side instead.
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// ── Session security flags ────────────────────────────────────────────────
// HttpOnly: block JS access to the session cookie (defense against XSS).
// SameSite=Lax: send the cookie on top-level GETs but block CSRF from POSTs.
// Secure: only set when running over HTTPS so local dev over HTTP still works.
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Lax');
if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
    ini_set('session.cookie_secure', 1);
}

header('Content-Type: application/json');
session_start();

// ── Manual autoloader — no composer in this project ───────────────────────
// Everything lives under /app; controllers depend on models which depend on core.
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
require_once $base . '/Controllers/AdminController.php';

use App\Core\Response;
use App\Controllers\{AuthController, QuestionController, RecommendController, AnswerController, StatsController, AdminController};

// ── Router ────────────────────────────────────────────────────────────────
// `_route` is the path rewritten by api/.htaccess (see RewriteRule there).
$method = $_SERVER['REQUEST_METHOD'];
$route  = trim($_GET['_route'] ?? '', '/');

// ── Admin middleware ──────────────────────────────────────────────────────
// Protect the /admin/* routes early, before any controller instantiation.
// StatsController has its own requireAdmin() call because /stats isn't under /admin.
$adminRoutes = ['admin/questions', 'admin/formations', 'admin/export'];
if (in_array($route, $adminRoutes, true)) {
    if (empty($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
        Response::error('Accès refusé', 403);
        exit;
    }
}

// ── CSRF guard on state-changing routes ───────────────────────────────────
// Every mutating endpoint (except /auth logout which is harmless) must present
// the token the client received from GET /csrf. hash_equals is timing-safe.
$csrfProtected = [
    ['POST', 'auth'], ['POST', 'answers'],
    ['POST', 'admin/questions'], ['PUT', 'admin/questions'], ['DELETE', 'admin/questions'],
    ['POST', 'admin/formations'], ['PUT', 'admin/formations'], ['DELETE', 'admin/formations'],
];
if (in_array([$method, $route], $csrfProtected, true)) {
    $clientToken  = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    if (!$clientToken || !$sessionToken || !hash_equals($sessionToken, $clientToken)) {
        Response::error('Token CSRF invalide', 403);
        exit;
    }
}

try {
    // Dispatch based on (method, route). Unknown tuples fall through to 404.
    match ([$method, $route]) {
        ['GET',  'csrf']      => (function () {
            // Lazily create the token on first read; reused across the whole session.
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
        ['GET',  'stats']               => (new StatsController())->index(),
        ['GET',    'admin/questions']   => (new AdminController())->listQuestions(),
        ['POST',   'admin/questions']   => (new AdminController())->createQuestion(),
        ['PUT',    'admin/questions']   => (new AdminController())->updateQuestion(),
        ['DELETE', 'admin/questions']   => (new AdminController())->deleteQuestion(),
        ['GET',    'admin/formations']  => (new AdminController())->listFormations(),
        ['POST',   'admin/formations']  => (new AdminController())->createFormation(),
        ['PUT',    'admin/formations']  => (new AdminController())->updateFormation(),
        ['DELETE', 'admin/formations']  => (new AdminController())->deleteFormation(),
        ['GET',    'admin/export']      => (new AdminController())->exportCsv(),
        default                         => Response::error('Route introuvable', 404),
    };
} catch (\PDOException) {
    // Distinct status text for DB failures to help ops distinguish them in logs.
    Response::error('Erreur base de données', 500);
} catch (\Throwable) {
    Response::error('Erreur serveur', 500);
}

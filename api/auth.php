<?php
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

// ── GET ?action=me  →  return current session user ───────────
if ($method === 'GET') {
    if (isset($_SESSION['user_id'])) {
        echo json_encode([
            'id'       => $_SESSION['user_id'],
            'username' => $_SESSION['username'],
            'role'     => $_SESSION['role'],
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Not authenticated']);
    }
    exit;
}

// ── POST  →  login / register / logout ───────────────────────
if ($method === 'POST') {
    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $body['action'] ?? '';

    // ── login ─────────────────────────────────────────────────
    if ($action === 'login') {
        $username = trim($body['username'] ?? '');
        $password = $body['password'] ?? '';

        if (!$username || !$password) {
            http_response_code(400);
            echo json_encode(['error' => 'Username and password required']);
            exit;
        }

        $stmt = db()->prepare(
            'SELECT id, username, password_hash, role FROM users WHERE username = ?'
        );
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid username or password']);
            exit;
        }

        session_regenerate_id(true);
        $_SESSION['user_id']  = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role']     = $user['role'];

        echo json_encode([
            'id'       => $user['id'],
            'username' => $user['username'],
            'role'     => $user['role'],
        ]);
        exit;
    }

    // ── register ──────────────────────────────────────────────
    if ($action === 'register') {
        $username = trim($body['username'] ?? '');
        $password = $body['password'] ?? '';

        if (!preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username)) {
            http_response_code(400);
            echo json_encode(['error' => 'Username must be 3–50 characters (letters, numbers, underscores only)']);
            exit;
        }

        if (strlen($password) < 4) {
            http_response_code(400);
            echo json_encode(['error' => 'Password must be at least 4 characters']);
            exit;
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);

        try {
            $stmt = db()->prepare(
                'INSERT INTO users (username, password_hash, role) VALUES (?, ?, "user")'
            );
            $stmt->execute([$username, $hash]);
            $userId = (int) db()->lastInsertId();
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                http_response_code(409);
                echo json_encode(['error' => 'Username already taken']);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Registration failed']);
            }
            exit;
        }

        session_regenerate_id(true);
        $_SESSION['user_id']  = $userId;
        $_SESSION['username'] = $username;
        $_SESSION['role']     = 'user';

        echo json_encode([
            'id'       => $userId,
            'username' => $username,
            'role'     => 'user',
        ]);
        exit;
    }

    // ── logout ────────────────────────────────────────────────
    if ($action === 'logout') {
        session_destroy();
        echo json_encode(['ok' => true]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['error' => 'Unknown action']);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);

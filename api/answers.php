<?php
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/db.php';

function requireAuth(): void {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Not authenticated']);
        exit;
    }
}

$method = $_SERVER['REQUEST_METHOD'];

// ── GET ?action=last  →  return last completed response ───────
if ($method === 'GET') {
    requireAuth();

    // Fetch the most recent survey_response for this user
    $stmt = db()->prepare(
        'SELECT id, completed_at FROM survey_responses
         WHERE user_id = ?
         ORDER BY completed_at DESC
         LIMIT 1'
    );
    $stmt->execute([$_SESSION['user_id']]);
    $response = $stmt->fetch();

    if (!$response) {
        echo json_encode(null);
        exit;
    }

    // Fetch all answers for that response
    $stmt = db()->prepare(
        'SELECT question_key, question_text, chosen_value, chosen_label
         FROM response_answers
         WHERE response_id = ?
         ORDER BY id ASC'
    );
    $stmt->execute([$response['id']]);
    $answers = $stmt->fetchAll();

    echo json_encode([
        'id'           => (int) $response['id'],
        'completed_at' => $response['completed_at'],
        'answers'      => $answers,
    ]);
    exit;
}

// ── POST  →  save a completed survey ─────────────────────────
if ($method === 'POST') {
    requireAuth();

    $body    = json_decode(file_get_contents('php://input'), true) ?? [];
    $answers = $body['answers'] ?? [];

    if (empty($answers) || !is_array($answers)) {
        http_response_code(400);
        echo json_encode(['error' => 'No answers provided']);
        exit;
    }

    $pdo = db();
    $pdo->beginTransaction();

    try {
        // Create the response record
        $stmt = $pdo->prepare('INSERT INTO survey_responses (user_id) VALUES (?)');
        $stmt->execute([$_SESSION['user_id']]);
        $responseId = (int) $pdo->lastInsertId();

        // Insert each answer
        $stmt = $pdo->prepare(
            'INSERT INTO response_answers
               (response_id, question_key, question_text, chosen_value, chosen_label)
             VALUES (?, ?, ?, ?, ?)'
        );

        foreach ($answers as $ans) {
            $stmt->execute([
                $responseId,
                $ans['question_key'],
                $ans['question_text'],
                $ans['chosen_value'],
                $ans['chosen_label'],
            ]);
        }

        $pdo->commit();
        echo json_encode(['id' => $responseId]);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save answers']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);

<?php
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/db.php';

// Admin only
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$pdo = db();

// ── 1. Totals ─────────────────────────────────────────────────
$totals = $pdo->query(
    'SELECT
       (SELECT COUNT(*) FROM users) AS total_users,
       (SELECT COUNT(*) FROM survey_responses) AS total_responses'
)->fetch();

// ── 2. Per-question answer distribution ──────────────────────
// Returns: question_key, question_text, chosen_label, count
$distStmt = $pdo->query(
    'SELECT
       ra.question_key,
       ra.question_text,
       ra.chosen_label,
       COUNT(*) AS cnt
     FROM response_answers ra
     GROUP BY ra.question_key, ra.chosen_label
     ORDER BY ra.question_key, ra.chosen_label'
);
$distRows = $distStmt->fetchAll();

// Group into { q1: { text, options: [{label, count}] }, ... }
$distribution = [];
foreach ($distRows as $row) {
    $key = $row['question_key'];
    if (!isset($distribution[$key])) {
        $distribution[$key] = [
            'question_key'  => $key,
            'question_text' => $row['question_text'],
            'options'       => [],
        ];
    }
    $distribution[$key]['options'][] = [
        'label' => $row['chosen_label'],
        'count' => (int) $row['cnt'],
    ];
}

// ── 3. Per-user: last response answers ───────────────────────
// For each user, get their latest survey_response and all its answers
$usersStmt = $pdo->query(
    'SELECT u.id, u.username, u.role, u.created_at,
            sr.id AS response_id, sr.completed_at
     FROM users u
     LEFT JOIN survey_responses sr ON sr.user_id = u.id
       AND sr.id = (
         SELECT MAX(id) FROM survey_responses WHERE user_id = u.id
       )
     ORDER BY u.username ASC'
);
$usersRows = $usersStmt->fetchAll();

// For users who have a response, fetch their answers
$userMap = [];
foreach ($usersRows as $row) {
    $userMap[$row['id']] = [
        'id'           => (int) $row['id'],
        'username'     => $row['username'],
        'role'         => $row['role'],
        'created_at'   => $row['created_at'],
        'response_id'  => $row['response_id'] ? (int) $row['response_id'] : null,
        'completed_at' => $row['completed_at'],
        'answers'      => [],
    ];
}

// Fetch answers for all latest responses in one query
$responseIds = array_filter(array_column($usersRows, 'response_id'));
if (!empty($responseIds)) {
    $placeholders = implode(',', array_fill(0, count($responseIds), '?'));
    $ansStmt = $pdo->prepare(
        "SELECT response_id, question_key, question_text, chosen_label
         FROM response_answers
         WHERE response_id IN ({$placeholders})
         ORDER BY id ASC"
    );
    $ansStmt->execute(array_values($responseIds));

    // Map response_id → user_id
    $responseToUser = [];
    foreach ($usersRows as $row) {
        if ($row['response_id']) {
            $responseToUser[(int) $row['response_id']] = (int) $row['id'];
        }
    }

    foreach ($ansStmt->fetchAll() as $ans) {
        $rid = (int) $ans['response_id'];
        $uid = $responseToUser[$rid] ?? null;
        if ($uid && isset($userMap[$uid])) {
            $userMap[$uid]['answers'][] = [
                'question_key'  => $ans['question_key'],
                'question_text' => $ans['question_text'],
                'chosen_label'  => $ans['chosen_label'],
            ];
        }
    }
}

echo json_encode([
    'totals'       => $totals,
    'distribution' => array_values($distribution),
    'users'        => array_values($userMap),
]);

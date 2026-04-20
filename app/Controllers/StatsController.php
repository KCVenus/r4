<?php
namespace App\Controllers;

use App\Core\Database;
use App\Core\Response;

/**
 * Stats controller — aggregates dashboard data for the admin view.
 *
 * All data comes from three queries:
 *  1) Totals (users, responses)
 *  2) Distribution of chosen labels per question (for the bar chart)
 *  3) Latest submission per user + the answers of that submission (for the table)
 */
class StatsController
{
    /**
     * Block non-admin sessions with 403 Forbidden.
     */
    private function requireAdmin(): void
    {
        if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
            Response::error('Accès interdit', 403);
        }
    }

    /**
     * GET /stats — return the aggregated dashboard payload.
     *
     * Shape: { totals, distribution[], users[] }
     *  - totals: { total_users, total_responses }
     *  - distribution: [{ question_key, question_text, options: [{label, count}] }]
     *  - users: [{ id, username, role, created_at, response_id, completed_at, answers: [...] }]
     */
    public function index(): void
    {
        $this->requireAdmin();

        $pdo = Database::getInstance();

        // 1) Totals — computed with two correlated SELECTs inside one statement
        //    so we only make a single round-trip to MySQL.
        $totals = $pdo->query(
            'SELECT
               (SELECT COUNT(*) FROM users)            AS total_users,
               (SELECT COUNT(*) FROM survey_responses) AS total_responses'
        )->fetch();

        // 2) Distribution per question — one row per (question, chosen_label)
        //    with its count. Re-grouped in PHP into a nested structure.
        $distributionRows = $pdo->query(
            'SELECT ra.question_key, ra.question_text, ra.chosen_label, COUNT(*) AS cnt
             FROM   response_answers ra
             GROUP  BY ra.question_key, ra.chosen_label
             ORDER  BY ra.question_key, ra.chosen_label'
        )->fetchAll();

        $distribution = [];
        foreach ($distributionRows as $row) {
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

        // 3) Users + their latest submission id. The correlated subquery picks
        //    the highest id per user, so we show the *most recent* run only.
        $usersRows = $pdo->query(
            'SELECT u.id, u.username, u.role, u.created_at,
                    sr.id AS response_id, sr.completed_at
             FROM   users u
             LEFT JOIN survey_responses sr
               ON  sr.user_id = u.id
               AND sr.id = (SELECT MAX(id) FROM survey_responses WHERE user_id = u.id)
             ORDER  BY u.username ASC'
        )->fetchAll();

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

        // Fetch all answers for those latest responses in a single IN () query
        // rather than looping per user — avoids an N+1 with big user tables.
        $responseIds = array_filter(array_column($usersRows, 'response_id'));
        if (!empty($responseIds)) {
            $placeholders  = implode(',', array_fill(0, count($responseIds), '?'));
            $answersStmt   = $pdo->prepare(
                "SELECT response_id, question_key, question_text, chosen_label
                 FROM   response_answers
                 WHERE  response_id IN ($placeholders)
                 ORDER  BY id ASC"
            );
            $answersStmt->execute(array_values($responseIds));

            // Build a response_id -> user_id lookup so we can route each answer
            // row back to its owner without re-querying the DB.
            $responseToUser = [];
            foreach ($usersRows as $row) {
                if ($row['response_id']) {
                    $responseToUser[(int) $row['response_id']] = (int) $row['id'];
                }
            }

            foreach ($answersStmt->fetchAll() as $answer) {
                $responseId = (int) $answer['response_id'];
                $userId     = $responseToUser[$responseId] ?? null;
                if ($userId && isset($userMap[$userId])) {
                    $userMap[$userId]['answers'][] = [
                        'question_key'  => $answer['question_key'],
                        'question_text' => $answer['question_text'],
                        'chosen_label'  => $answer['chosen_label'],
                    ];
                }
            }
        }

        Response::json([
            'totals'       => $totals,
            'distribution' => array_values($distribution),
            'users'        => array_values($userMap),
        ]);
    }
}

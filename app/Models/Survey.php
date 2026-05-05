<?php
namespace App\Models;

use App\Core\Database;

/**
 * Survey model — persists a completed questionnaire.
 *
 * Two tables are involved:
 *  - survey_responses: one row per run of the quiz (header).
 *  - response_answers: one row per answer picked during that run (lines).
 */
class Survey
{
    /**
     * Persist a full questionnaire submission atomically.
     *
     * Uses an explicit transaction so a mid-insert failure rolls back the
     * parent survey_responses row — we never want orphan headers with no
     * answers. The prepared INSERT for answers is reused across iterations.
     *
     * @param int      $userId    Authenticated user id (owner of the submission).
     * @param array    $answers   List of {question_key, question_text, chosen_value, chosen_label}.
     * @param int|null $userLevel Study level chosen at the start of the test
     *                            (5/6/7/8); null when unknown (legacy clients).
     * @return int                Id of the created survey_responses row.
     * @throws \Exception         Rethrown after rollback so the controller returns 500.
     */
    public static function save(int $userId, array $answers, ?int $userLevel = null): int
    {
        $pdo = Database::getInstance();
        $pdo->beginTransaction();

        try {
            // 1) Create the parent "response" row.
            $pdo->prepare('INSERT INTO survey_responses (user_id, user_level) VALUES (?, ?)')
                ->execute([$userId, $userLevel]);
            $responseId = (int) $pdo->lastInsertId();

            // 2) Insert each chosen answer, snapshotting the question text so
            //    subsequent edits to the questions table don't rewrite history.
            $answerStmt = $pdo->prepare(
                'INSERT INTO response_answers
                   (response_id, question_key, question_text, chosen_value, chosen_label)
                 VALUES (?, ?, ?, ?, ?)'
            );

            foreach ($answers as $answer) {
                $answerStmt->execute([
                    $responseId,
                    $answer['question_key'],
                    $answer['question_text'],
                    $answer['chosen_value'],
                    $answer['chosen_label'],
                ]);
            }

            $pdo->commit();
            return $responseId;

        } catch (\Exception $e) {
            // Any PDO/validation error must undo the header insert.
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Fetch the most recent submission for a given user, with its answers.
     *
     * @param int $userId User whose last submission we want.
     * @return array|null Submission payload or null if they never completed the quiz.
     */
    public static function getLast(int $userId): ?array
    {
        $pdo  = Database::getInstance();
        $responseStmt = $pdo->prepare(
            'SELECT id, user_level, completed_at FROM survey_responses
             WHERE  user_id = ?
             ORDER  BY completed_at DESC LIMIT 1'
        );
        $responseStmt->execute([$userId]);
        $response = $responseStmt->fetch();

        if (!$response) return null;

        $answersStmt = $pdo->prepare(
            'SELECT question_key, question_text, chosen_value, chosen_label
             FROM   response_answers
             WHERE  response_id = ?
             ORDER  BY id ASC'
        );
        $answersStmt->execute([$response['id']]);

        return [
            'id'           => (int) $response['id'],
            'user_level'   => $response['user_level'] !== null ? (int) $response['user_level'] : null,
            'completed_at' => $response['completed_at'],
            'answers'      => $answersStmt->fetchAll(),
        ];
    }

    /**
     * List every submission of a user, with its answers, recomputed top
     * formations and the level chosen at test time. Newest first.
     *
     * Powers the GET /me/tests endpoint backing the user account page (F8).
     * Recommendations are recomputed on the fly from the saved answers
     * rather than persisted: the formations table can change between two
     * tests, so re-running the engine guarantees fresh, consistent results.
     *
     * @param int $userId Owner of the listing.
     * @return array      Each entry: {id, user_level, completed_at, answers, formations}.
     */
    public static function listForUser(int $userId): array
    {
        $pdo = Database::getInstance();
        $stmt = $pdo->prepare(
            'SELECT id, user_level, completed_at FROM survey_responses
             WHERE  user_id = ?
             ORDER  BY completed_at DESC'
        );
        $stmt->execute([$userId]);
        $responses = $stmt->fetchAll();

        if (empty($responses)) return [];

        $answersStmt = $pdo->prepare(
            'SELECT question_key, question_text, chosen_value, chosen_label
             FROM   response_answers
             WHERE  response_id = ?
             ORDER  BY id ASC'
        );

        $list = [];
        foreach ($responses as $response) {
            $answersStmt->execute([$response['id']]);
            $answers = $answersStmt->fetchAll();
            $level   = $response['user_level'] !== null ? (int) $response['user_level'] : null;

            $list[] = [
                'id'           => (int) $response['id'],
                'user_level'   => $level,
                'completed_at' => $response['completed_at'],
                'answers'      => $answers,
                'formations'   => Formation::recommend($answers, $level),
            ];
        }

        return $list;
    }
}

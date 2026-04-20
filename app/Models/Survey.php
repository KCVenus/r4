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
     * @param int   $userId  Authenticated user id (owner of the submission).
     * @param array $answers List of {question_key, question_text, chosen_value, chosen_label}.
     * @return int           Id of the created survey_responses row.
     * @throws \Exception    Rethrown after rollback so the controller returns 500.
     */
    public static function save(int $userId, array $answers): int
    {
        $pdo = Database::getInstance();
        $pdo->beginTransaction();

        try {
            // 1) Create the parent "response" row.
            $pdo->prepare('INSERT INTO survey_responses (user_id) VALUES (?)')
                ->execute([$userId]);
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
            'SELECT id, completed_at FROM survey_responses
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
            'completed_at' => $response['completed_at'],
            'answers'      => $answersStmt->fetchAll(),
        ];
    }
}

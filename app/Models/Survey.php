<?php
namespace App\Models;

use App\Core\Database;

class Survey
{
    public static function save(int $userId, array $answers): int
    {
        $pdo = Database::getInstance();
        $pdo->beginTransaction();

        try {
            $pdo->prepare('INSERT INTO survey_responses (user_id) VALUES (?)')
                ->execute([$userId]);
            $responseId = (int) $pdo->lastInsertId();

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
            return $responseId;

        } catch (\Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function getLast(int $userId): ?array
    {
        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare(
            'SELECT id, completed_at FROM survey_responses
             WHERE  user_id = ?
             ORDER  BY completed_at DESC LIMIT 1'
        );
        $stmt->execute([$userId]);
        $response = $stmt->fetch();

        if (!$response) return null;

        $stmt = $pdo->prepare(
            'SELECT question_key, question_text, chosen_value, chosen_label
             FROM   response_answers
             WHERE  response_id = ?
             ORDER  BY id ASC'
        );
        $stmt->execute([$response['id']]);

        return [
            'id'           => (int) $response['id'],
            'completed_at' => $response['completed_at'],
            'answers'      => $stmt->fetchAll(),
        ];
    }
}

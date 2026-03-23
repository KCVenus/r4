<?php
namespace App\Models;

use App\Core\Database;

class Question
{
    public static function getActive(): array
    {
        $pdo = Database::getInstance();

        $questions = $pdo->query(
            'SELECT id, question_key, text
             FROM   questions
             WHERE  active = 1
             ORDER  BY sort_order, id'
        )->fetchAll();

        $stmt   = $pdo->prepare(
            'SELECT value, label
             FROM   question_options
             WHERE  question_id = ?
             ORDER  BY sort_order, id'
        );

        $result = [];
        foreach ($questions as $q) {
            $stmt->execute([$q['id']]);
            $result[] = [
                'id'      => $q['question_key'],
                'text'    => $q['text'],
                'options' => $stmt->fetchAll(),
            ];
        }

        return $result;
    }
}

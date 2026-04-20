<?php
namespace App\Models;

use App\Core\Database;

class Question
{
    public static function getAll(): array
    {
        $pdo = Database::getInstance();

        $questions = $pdo->query(
            'SELECT id, question_key, text, sort_order, active
             FROM   questions
             ORDER  BY sort_order, id'
        )->fetchAll();

        $stmt = $pdo->prepare(
            'SELECT id, value, label, sort_order
             FROM   question_options
             WHERE  question_id = ?
             ORDER  BY sort_order, id'
        );

        $result = [];
        foreach ($questions as $q) {
            $stmt->execute([$q['id']]);
            $result[] = array_merge($q, ['options' => $stmt->fetchAll()]);
        }

        return $result;
    }

    public static function create(string $key, string $text, int $sortOrder): int
    {
        $pdo = Database::getInstance();
        $pdo->prepare(
            'INSERT INTO questions (question_key, text, sort_order) VALUES (?, ?, ?)'
        )->execute([$key, $text, $sortOrder]);
        return (int) $pdo->lastInsertId();
    }

    public static function update(int $id, string $text, int $sortOrder, bool $active): void
    {
        Database::getInstance()->prepare(
            'UPDATE questions SET text = ?, sort_order = ?, active = ? WHERE id = ?'
        )->execute([$text, $sortOrder, $active ? 1 : 0, $id]);
    }

    public static function deleteById(int $id): void
    {
        Database::getInstance()
            ->prepare('DELETE FROM questions WHERE id = ?')
            ->execute([$id]);
    }

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

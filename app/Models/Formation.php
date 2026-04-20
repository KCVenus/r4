<?php
namespace App\Models;

use App\Core\Database;

class Formation
{
    public static function getAll(): array
    {
        return Database::getInstance()->query(
            'SELECT id, name, description, contact_email, contact_url, active
             FROM   formations
             ORDER  BY id'
        )->fetchAll();
    }

    public static function create(string $name, ?string $desc, ?string $email, ?string $url): int
    {
        $pdo = Database::getInstance();
        $pdo->prepare(
            'INSERT INTO formations (name, description, contact_email, contact_url) VALUES (?, ?, ?, ?)'
        )->execute([$name, $desc, $email, $url]);
        return (int) $pdo->lastInsertId();
    }

    public static function update(int $id, string $name, ?string $desc, ?string $email, ?string $url, bool $active): void
    {
        Database::getInstance()->prepare(
            'UPDATE formations SET name = ?, description = ?, contact_email = ?, contact_url = ?, active = ? WHERE id = ?'
        )->execute([$name, $desc, $email, $url, $active ? 1 : 0, $id]);
    }

    public static function deleteById(int $id): void
    {
        Database::getInstance()
            ->prepare('DELETE FROM formations WHERE id = ?')
            ->execute([$id]);
    }

    public static function recommend(array $answers): array
    {
        $pdo    = Database::getInstance();
        $scores = [];

        $stmt = $pdo->prepare(
            'SELECT fs.formation_id, fs.points
             FROM   formation_scores  fs
             JOIN   question_options  qo ON qo.id  = fs.option_id
             JOIN   questions         q  ON q.id   = qo.question_id
             WHERE  q.question_key = ?
               AND  qo.value       = ?'
        );

        foreach ($answers as $answer) {
            $key   = $answer['question_key'] ?? '';
            $value = $answer['chosen_value']  ?? '';
            if (!$key || !$value) continue;

            $stmt->execute([$key, $value]);
            foreach ($stmt->fetchAll() as $row) {
                $fid          = (int) $row['formation_id'];
                $scores[$fid] = ($scores[$fid] ?? 0) + (int) $row['points'];
            }
        }

        if (empty($scores)) {
            return $pdo->query(
                'SELECT id, name, description, contact_email, contact_url
                 FROM   formations WHERE active = 1 LIMIT 3'
            )->fetchAll();
        }

        arsort($scores);
        $topIds = array_keys(array_slice($scores, 0, 3, true));
        $in     = implode(',', array_map('intval', $topIds));

        $formations = $pdo->query(
            "SELECT id, name, description, contact_email, contact_url
             FROM   formations
             WHERE  id IN ($in) AND active = 1"
        )->fetchAll();

        usort($formations, fn($a, $b) => ($scores[$b['id']] ?? 0) - ($scores[$a['id']] ?? 0));

        return $formations;
    }
}

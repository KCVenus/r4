<?php
namespace App\Models;

use App\Core\Database;

/**
 * Formation model — CRUD + the scoring/recommendation engine.
 *
 * A "formation" is a training program the user can be matched against.
 * Recommendations rely on the `formation_scores` pivot table, which maps
 * (option_id -> formation_id) with a point value.
 */
class Formation
{
    /**
     * Fetch every formation, active or not, for the admin list.
     *
     * @return array Rows ordered by insertion (id).
     */
    public static function getAll(): array
    {
        return Database::getInstance()->query(
            'SELECT id, name, description, contact_email, contact_url, active
             FROM   formations
             ORDER  BY id'
        )->fetchAll();
    }

    /**
     * Fetch a single active formation by id, or null when missing/inactive.
     *
     * Used by the contact form (F3/F6) to resolve the recipient address
     * from the formation the user picked on the result screen.
     *
     * @param int $id Formation id.
     * @return array|null Row with id/name/contact_email/contact_url or null.
     */
    public static function getActiveById(int $id): ?array
    {
        $stmt = Database::getInstance()->prepare(
            'SELECT id, name, description, contact_email, contact_url
             FROM   formations
             WHERE  id = ? AND active = 1'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row !== false ? $row : null;
    }

    /**
     * Insert a new formation. Active by default in the DB schema.
     *
     * @param string      $name  Display name.
     * @param string|null $desc  Optional long description.
     * @param string|null $email Optional contact email.
     * @param string|null $url   Optional landing-page URL.
     * @return int               Auto-increment id of the new row.
     */
    public static function create(string $name, ?string $desc, ?string $email, ?string $url): int
    {
        $pdo = Database::getInstance();
        $pdo->prepare(
            'INSERT INTO formations (name, description, contact_email, contact_url) VALUES (?, ?, ?, ?)'
        )->execute([$name, $desc, $email, $url]);
        return (int) $pdo->lastInsertId();
    }

    /**
     * Update every editable field of a formation at once.
     *
     * @param int         $id     Formation id.
     * @param string      $name   New name.
     * @param string|null $desc   New description (null allowed).
     * @param string|null $email  New contact email (null allowed).
     * @param string|null $url    New contact URL (null allowed).
     * @param bool        $active Visibility flag.
     */
    public static function update(int $id, string $name, ?string $desc, ?string $email, ?string $url, bool $active): void
    {
        Database::getInstance()->prepare(
            'UPDATE formations SET name = ?, description = ?, contact_email = ?, contact_url = ?, active = ? WHERE id = ?'
        )->execute([$name, $desc, $email, $url, $active ? 1 : 0, $id]);
    }

    /**
     * Hard-delete a formation. Associated scores are removed via CASCADE.
     *
     * @param int $id Formation id.
     */
    public static function deleteById(int $id): void
    {
        Database::getInstance()
            ->prepare('DELETE FROM formations WHERE id = ?')
            ->execute([$id]);
    }

    /**
     * Compute the top 3 formations matching the given answers.
     *
     * Scoring algorithm:
     *   1. For each (question_key, chosen_value), look up every formation that
     *      scores points on that option via the formation_scores pivot.
     *   2. Sum points per formation id.
     *   3. Sort descending, keep the top 3, compute a normalised percent
     *      against the best score so the top card always shows 100%.
     *
     * Fallback: if no answer yields any points (e.g. brand-new dataset),
     * return the first 3 active formations so the user is never shown an
     * empty result screen.
     *
     * @param array $answers Array of {question_key, chosen_value, ...}.
     * @return array         Up to 3 formations with `score` and `percent` fields.
     */
    public static function recommend(array $answers): array
    {
        $pdo    = Database::getInstance();
        $scores = [];

        // Prepared once, executed per answer — avoids re-parsing the SQL in the loop.
        $scoreStmt = $pdo->prepare(
            'SELECT fs.formation_id, fs.points
             FROM   formation_scores  fs
             JOIN   question_options  qo ON qo.id  = fs.option_id
             JOIN   questions         q  ON q.id   = qo.question_id
             WHERE  q.question_key = ?
               AND  qo.value       = ?'
        );

        foreach ($answers as $answer) {
            $questionKey = $answer['question_key'] ?? '';
            $chosenValue = $answer['chosen_value']  ?? '';
            // Skip malformed entries silently — the public /recommend endpoint
            // accepts guest submissions so we must tolerate noisy payloads.
            if (!$questionKey || !$chosenValue) continue;

            $scoreStmt->execute([$questionKey, $chosenValue]);
            foreach ($scoreStmt->fetchAll() as $row) {
                $formationId          = (int) $row['formation_id'];
                $scores[$formationId] = ($scores[$formationId] ?? 0) + (int) $row['points'];
            }
        }

        // No matches at all -> return a sensible default set rather than an empty screen.
        if (empty($scores)) {
            return $pdo->query(
                'SELECT id, name, description, contact_email, contact_url
                 FROM   formations WHERE active = 1 LIMIT 3'
            )->fetchAll();
        }

        arsort($scores);
        $topIds   = array_keys(array_slice($scores, 0, 3, true));
        $maxScore = max($scores) ?: 1;
        // Safe because $topIds originates from DB-controlled integer keys,
        // but we still cast through intval to defend against edge cases.
        $idList   = implode(',', array_map('intval', $topIds));

        $formations = $pdo->query(
            "SELECT id, name, description, contact_email, contact_url
             FROM   formations
             WHERE  id IN ($idList) AND active = 1"
        )->fetchAll();

        // MySQL returned rows in PK order; re-sort by score so the best match comes first.
        usort($formations, fn($a, $b) => ($scores[$b['id']] ?? 0) - ($scores[$a['id']] ?? 0));

        // Attach raw score + percentage (relative to best) for the UI progress bar.
        return array_map(function ($formation) use ($scores, $maxScore) {
            $score = $scores[$formation['id']] ?? 0;
            return array_merge($formation, [
                'score'   => $score,
                'percent' => (int) round(($score / $maxScore) * 100),
            ]);
        }, $formations);
    }
}

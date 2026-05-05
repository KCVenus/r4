<?php
namespace App\Models;

use App\Core\Database;

/**
 * Question model — read/write access to `questions` and `question_options`.
 *
 * Two fetch paths exist:
 *  - getAll(): admin view, returns active + inactive with full metadata.
 *  - getActive(): public view used by the questionnaire frontend.
 */
class Question
{
    /**
     * Fetch every question (active + inactive) with its options.
     *
     * Used by the admin dashboard. Two queries are issued: one for the
     * question rows, then one per question for its options. N+1 is accepted
     * here because the question count is small (a few dozen max).
     *
     * @return array List of questions, each containing an `options` array.
     */
    public static function getAll(): array
    {
        $pdo = Database::getInstance();

        $questions = $pdo->query(
            'SELECT id, question_key, text, sort_order, active, quick
             FROM   questions
             ORDER  BY sort_order, id'
        )->fetchAll();

        $optionsStmt = $pdo->prepare(
            'SELECT id, value, label, sort_order
             FROM   question_options
             WHERE  question_id = ?
             ORDER  BY sort_order, id'
        );

        $result = [];
        foreach ($questions as $question) {
            $optionsStmt->execute([$question['id']]);
            $result[] = array_merge($question, ['options' => $optionsStmt->fetchAll()]);
        }

        return $result;
    }

    /**
     * Insert a new question. Options are created separately via a dedicated endpoint.
     *
     * @param string $key       Short machine id (e.g. "q11").
     * @param string $text      Human-readable question text.
     * @param int    $sortOrder Ascending sort order on the frontend.
     * @return int              Auto-increment id of the new row.
     */
    public static function create(string $key, string $text, int $sortOrder): int
    {
        $pdo = Database::getInstance();
        $pdo->prepare(
            'INSERT INTO questions (question_key, text, sort_order) VALUES (?, ?, ?)'
        )->execute([$key, $text, $sortOrder]);
        return (int) $pdo->lastInsertId();
    }

    /**
     * Update the editable fields of an existing question.
     *
     * Note: question_key is immutable (other tables reference it as FK-like string).
     *
     * @param int    $id        Question id.
     * @param string $text      New question text.
     * @param int    $sortOrder New sort order.
     * @param bool   $active    Visible to end-users when true.
     */
    public static function update(int $id, string $text, int $sortOrder, bool $active): void
    {
        Database::getInstance()->prepare(
            'UPDATE questions SET text = ?, sort_order = ?, active = ? WHERE id = ?'
        )->execute([$text, $sortOrder, $active ? 1 : 0, $id]);
    }

    /**
     * Delete a question. ON DELETE CASCADE in the schema cleans up options and scores.
     *
     * @param int $id Question id to remove.
     */
    public static function deleteById(int $id): void
    {
        Database::getInstance()
            ->prepare('DELETE FROM questions WHERE id = ?')
            ->execute([$id]);
    }

    /**
     * Fetch one question with its options AND the per-option formation scores.
     *
     * Shape:
     *   {
     *     id, question_key, text, sort_order, active, quick,
     *     options: [
     *       { id, value, label, sort_order, scores: { formation_id: points, ... } },
     *       ...
     *     ]
     *   }
     *
     * Used by the admin question editor modal: returns everything needed to
     * render text + options + per-option formation weights in a single payload.
     *
     * @param int $id Question primary key.
     * @return array|null  Question payload, or null if no row matches.
     */
    public static function getOneFull(int $id): ?array
    {
        $pdo = Database::getInstance();

        $stmt = $pdo->prepare(
            'SELECT id, question_key, text, sort_order, active, quick
             FROM   questions
             WHERE  id = ?'
        );
        $stmt->execute([$id]);
        $question = $stmt->fetch();
        if (!$question) return null;

        $optionsStmt = $pdo->prepare(
            'SELECT id, value, label, sort_order
             FROM   question_options
             WHERE  question_id = ?
             ORDER  BY sort_order, id'
        );
        $optionsStmt->execute([$id]);
        $options = $optionsStmt->fetchAll();

        // Bulk-load all scores for this question's options in a single query
        // (avoids N+1 over the option count, even though it's typically 2).
        if (count($options) > 0) {
            $optionIds = array_column($options, 'id');
            $placeholders = implode(',', array_fill(0, count($optionIds), '?'));
            $scoresStmt = $pdo->prepare(
                "SELECT option_id, formation_id, points
                 FROM   formation_scores
                 WHERE  option_id IN ($placeholders)"
            );
            $scoresStmt->execute($optionIds);
            $scoresByOption = [];
            foreach ($scoresStmt->fetchAll() as $row) {
                $scoresByOption[(int) $row['option_id']][(int) $row['formation_id']] = (int) $row['points'];
            }
            foreach ($options as &$opt) {
                $opt['scores'] = $scoresByOption[(int) $opt['id']] ?? new \stdClass();
            }
            unset($opt);
        }

        $question['options'] = $options;
        return $question;
    }

    /**
     * Atomically save a question, its options and the per-option formation scores.
     *
     * Strategy: wrap in a transaction.
     *   1. UPDATE the question row (text/sort_order/active/quick).
     *   2. Reconcile options: existing options with id are UPDATEd, new options
     *      (no id) are INSERTed, removed options are DELETEd. CASCADE removes
     *      orphaned formation_scores automatically when an option is deleted.
     *   3. For each option, replace its formation_scores: DELETE then bulk
     *      INSERT only the rows with points > 0 (a row implicitly means
     *      "this option contributes N points to that formation").
     *
     * The frontend sends the full state every time (no diff), so the server
     * just needs to bring the DB to match.
     *
     * @param int   $id   Question id.
     * @param array $data {
     *   text: string, sort_order: int, active: bool, quick: bool,
     *   options: [
     *     { id?: int, value: string, label: string, sort_order: int,
     *       scores: { formation_id: points, ... } }, ...
     *   ]
     * }
     */
    public static function saveFull(int $id, array $data): void
    {
        $pdo = Database::getInstance();
        $pdo->beginTransaction();
        try {
            // 1. Question row.
            $pdo->prepare(
                'UPDATE questions
                 SET    text = ?, sort_order = ?, active = ?, quick = ?
                 WHERE  id = ?'
            )->execute([
                trim($data['text'] ?? ''),
                (int) ($data['sort_order'] ?? 0),
                !empty($data['active']) ? 1 : 0,
                !empty($data['quick']) ? 1 : 0,
                $id,
            ]);

            // 2. Reconcile options.
            $incomingOptions = $data['options'] ?? [];
            $keptOptionIds   = [];

            $insertOpt = $pdo->prepare(
                'INSERT INTO question_options (question_id, value, label, sort_order)
                 VALUES (?, ?, ?, ?)'
            );
            $updateOpt = $pdo->prepare(
                'UPDATE question_options
                 SET    value = ?, label = ?, sort_order = ?
                 WHERE  id = ? AND question_id = ?'
            );

            foreach ($incomingOptions as $opt) {
                $value = trim($opt['value'] ?? '');
                $label = trim($opt['label'] ?? '');
                $sort  = (int) ($opt['sort_order'] ?? 0);
                if ($value === '' || $label === '') continue;

                if (!empty($opt['id'])) {
                    $optId = (int) $opt['id'];
                    $updateOpt->execute([$value, $label, $sort, $optId, $id]);
                } else {
                    $insertOpt->execute([$id, $value, $label, $sort]);
                    $optId = (int) $pdo->lastInsertId();
                }
                $keptOptionIds[] = $optId;

                // 3. Replace this option's formation scores.
                $pdo->prepare('DELETE FROM formation_scores WHERE option_id = ?')
                    ->execute([$optId]);

                $insertScore = $pdo->prepare(
                    'INSERT INTO formation_scores (option_id, formation_id, points)
                     VALUES (?, ?, ?)'
                );
                $scores = $opt['scores'] ?? [];
                foreach ($scores as $formationId => $points) {
                    $points = (int) $points;
                    if ($points <= 0) continue;
                    $insertScore->execute([$optId, (int) $formationId, $points]);
                }
            }

            // Remove options that are no longer present in the payload.
            // CASCADE handles formation_scores cleanup.
            if (count($keptOptionIds) === 0) {
                $pdo->prepare('DELETE FROM question_options WHERE question_id = ?')
                    ->execute([$id]);
            } else {
                $placeholders = implode(',', array_fill(0, count($keptOptionIds), '?'));
                $params = array_merge([$id], $keptOptionIds);
                $pdo->prepare(
                    "DELETE FROM question_options
                     WHERE question_id = ? AND id NOT IN ($placeholders)"
                )->execute($params);
            }

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Fetch only active questions + their options, shaped for the public frontend.
     *
     * The returned `id` is the question_key (string) rather than the numeric id —
     * the frontend uses it as a map key for answers.
     *
     * @param bool $quickOnly When true, restrict to questions flagged for the
     *                        short test (10-question subset). Default false =
     *                        the full 30-question catalogue.
     * @return array Array of {id, text, options[]} objects.
     */
    public static function getActive(bool $quickOnly = false): array
    {
        $pdo = Database::getInstance();

        $where = 'active = 1';
        if ($quickOnly) $where .= ' AND quick = 1';

        $questions = $pdo->query(
            "SELECT id, question_key, text
             FROM   questions
             WHERE  $where
             ORDER  BY sort_order, id"
        )->fetchAll();

        $optionsStmt = $pdo->prepare(
            'SELECT value, label
             FROM   question_options
             WHERE  question_id = ?
             ORDER  BY sort_order, id'
        );

        $result = [];
        foreach ($questions as $question) {
            $optionsStmt->execute([$question['id']]);
            $result[] = [
                // Expose question_key as public id — frontend never sees the numeric PK.
                'id'      => $question['question_key'],
                'text'    => $question['text'],
                'options' => $optionsStmt->fetchAll(),
            ];
        }

        return $result;
    }
}

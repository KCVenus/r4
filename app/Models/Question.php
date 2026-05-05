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
            'SELECT id, question_key, text, sort_order, active
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
     * Total number of questions (active + inactive).
     *
     * Used to compute the valid upper bound for `sort_order` when admins
     * create or move a question — accepting positions beyond `count + 1`
     * leaves gaps that confuse the ordered listing.
     *
     * @return int Row count of the `questions` table.
     */
    public static function count(): int
    {
        return (int) Database::getInstance()
            ->query('SELECT COUNT(*) FROM questions')
            ->fetchColumn();
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
     * Fetch only active questions + their options, shaped for the public frontend.
     *
     * The returned `id` is the question_key (string) rather than the numeric id —
     * the frontend uses it as a map key for answers.
     *
     * @return array Array of {id, text, options[]} objects.
     */
    public static function getActive(): array
    {
        $pdo = Database::getInstance();

        $questions = $pdo->query(
            'SELECT id, question_key, text
             FROM   questions
             WHERE  active = 1
             ORDER  BY sort_order, id'
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

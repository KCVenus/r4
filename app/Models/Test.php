<?php
namespace App\Models;

use App\Core\Database;

/**
 * Test model — CRUD on the `tests` catalogue and the `test_questions` pivot.
 *
 * A "test" is a named subset of the question pool with its own ordering.
 * The same question can belong to several tests with different positions.
 * Replaces the old `questions.quick` boolean (cf. migration_v8_tests.sql).
 */
class Test
{
    /**
     * Every active test, ordered by id (creation order).
     *
     * Includes a `question_count` aggregate so the public picker and the
     * admin list can show the size of each test without an extra round-trip.
     *
     * @return array Rows of {id, slug, name, description, active, question_count}.
     */
    public static function getAllActive(): array
    {
        return Database::getInstance()->query(
            'SELECT t.id, t.slug, t.name, t.description, t.active,
                    COUNT(tq.question_id) AS question_count
             FROM   tests t
             LEFT JOIN test_questions tq ON tq.test_id = t.id
             WHERE  t.active = 1
             GROUP  BY t.id
             ORDER  BY t.id'
        )->fetchAll();
    }

    /**
     * Every test (active + inactive) for the admin list.
     *
     * @return array Rows of {id, slug, name, description, active, question_count}.
     */
    public static function getAll(): array
    {
        return Database::getInstance()->query(
            'SELECT t.id, t.slug, t.name, t.description, t.active,
                    COUNT(tq.question_id) AS question_count
             FROM   tests t
             LEFT JOIN test_questions tq ON tq.test_id = t.id
             GROUP  BY t.id
             ORDER  BY t.id'
        )->fetchAll();
    }

    /**
     * Resolve a test by its slug. Used by the public /questions endpoint.
     *
     * @param string $slug URL-safe identifier.
     * @return array|null  Row or null when not found / inactive.
     */
    public static function findActiveBySlug(string $slug): ?array
    {
        $stmt = Database::getInstance()
            ->prepare('SELECT id, slug, name, description, active FROM tests WHERE slug = ? AND active = 1');
        $stmt->execute([$slug]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Fetch the full editor payload for one test: row + its question_id list
     * with their per-test sort_order. Used by the admin editor.
     *
     * @param int $id Test primary key.
     * @return array|null { id, slug, name, description, active, questions: [{id, sort_order}] }
     */
    public static function getOneFull(int $id): ?array
    {
        $pdo = Database::getInstance();

        $stmt = $pdo->prepare(
            'SELECT id, slug, name, description, active FROM tests WHERE id = ?'
        );
        $stmt->execute([$id]);
        $test = $stmt->fetch();
        if (!$test) return null;

        $qStmt = $pdo->prepare(
            'SELECT question_id, sort_order
             FROM   test_questions
             WHERE  test_id = ?
             ORDER  BY sort_order, question_id'
        );
        $qStmt->execute([$id]);
        $test['questions'] = $qStmt->fetchAll();

        return $test;
    }

    /**
     * Insert a new test. Caller is expected to have validated the slug
     * (uniqueness is enforced by the UNIQUE key in the schema).
     *
     * @param string      $slug
     * @param string      $name
     * @param string|null $description
     * @param int|null    $createdBy User id of the creator.
     * @return int                   Auto-increment id.
     */
    public static function create(string $slug, string $name, ?string $description, ?int $createdBy): int
    {
        $pdo = Database::getInstance();
        $pdo->prepare(
            'INSERT INTO tests (slug, name, description, created_by) VALUES (?, ?, ?, ?)'
        )->execute([$slug, $name, $description, $createdBy]);
        return (int) $pdo->lastInsertId();
    }

    /**
     * Atomically update a test's metadata + its question membership.
     *
     * Strategy: UPDATE the row, then DELETE every test_questions row for
     * this test and bulk-INSERT the incoming list. Simpler than diffing,
     * cheap given the small N.
     *
     * @param int   $id   Test id.
     * @param array $data {
     *   name: string, description: string|null, active: bool,
     *   questions: [{question_id: int, sort_order: int}, ...]
     * }
     */
    public static function saveFull(int $id, array $data): void
    {
        $pdo = Database::getInstance();
        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                'UPDATE tests SET name = ?, description = ?, active = ? WHERE id = ?'
            )->execute([
                trim($data['name'] ?? ''),
                trim($data['description'] ?? '') ?: null,
                !empty($data['active']) ? 1 : 0,
                $id,
            ]);

            $pdo->prepare('DELETE FROM test_questions WHERE test_id = ?')->execute([$id]);

            $insert = $pdo->prepare(
                'INSERT INTO test_questions (test_id, question_id, sort_order) VALUES (?, ?, ?)'
            );
            foreach ($data['questions'] ?? [] as $q) {
                $qid   = (int) ($q['question_id'] ?? 0);
                $order = max(1, (int) ($q['sort_order'] ?? 1));
                if ($qid > 0) $insert->execute([$id, $qid, $order]);
            }

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Delete a test. Pivot rows are removed via ON DELETE CASCADE.
     *
     * @param int $id Test id.
     */
    public static function deleteById(int $id): void
    {
        Database::getInstance()
            ->prepare('DELETE FROM tests WHERE id = ?')
            ->execute([$id]);
    }

    /**
     * Replace the test memberships of a single question.
     *
     * Used by the question editor so coordinators can toggle which tests
     * a question belongs to without leaving the question modal. The new
     * row's sort_order defaults to "append at the end of the test", i.e.
     * `MAX(sort_order) + 1` per test.
     *
     * Transaction-agnostic: starts its own transaction only if none is
     * already active, so callers like Question::saveFull() that already
     * wrap their work in a transaction can call this safely.
     *
     * @param int   $questionId
     * @param array $testIds    List of test ids the question should belong to.
     */
    public static function setMembershipsForQuestion(int $questionId, array $testIds): void
    {
        $pdo = Database::getInstance();
        $startedTx = !$pdo->inTransaction();
        if ($startedTx) $pdo->beginTransaction();

        try {
            $pdo->prepare('DELETE FROM test_questions WHERE question_id = ?')
                ->execute([$questionId]);

            // Append at the end of each target test (max sort_order + 1).
            $tailStmt = $pdo->prepare(
                'SELECT COALESCE(MAX(sort_order), 0) FROM test_questions WHERE test_id = ?'
            );
            $insert = $pdo->prepare(
                'INSERT INTO test_questions (test_id, question_id, sort_order) VALUES (?, ?, ?)'
            );
            foreach ($testIds as $rawId) {
                $tid = (int) $rawId;
                if ($tid <= 0) continue;
                $tailStmt->execute([$tid]);
                $next = (int) $tailStmt->fetchColumn() + 1;
                $insert->execute([$tid, $questionId, $next]);
            }

            if ($startedTx) $pdo->commit();
        } catch (\Throwable $e) {
            if ($startedTx) $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Memberships of a single question — the current `test_id` list.
     *
     * @param int $questionId
     * @return int[] Test ids.
     */
    public static function getTestIdsForQuestion(int $questionId): array
    {
        $stmt = Database::getInstance()->prepare(
            'SELECT test_id FROM test_questions WHERE question_id = ? ORDER BY test_id'
        );
        $stmt->execute([$questionId]);
        return array_map(fn($r) => (int) $r['test_id'], $stmt->fetchAll());
    }
}

<?php
namespace App\Controllers;

use App\Core\Database;
use App\Core\Response;
use App\Models\Formation;
use App\Models\Question;

/**
 * Admin controller — CRUD endpoints for questions and formations, plus CSV export.
 *
 * The admin role is enforced upstream in api/index.php (route-level middleware),
 * so each method assumes the caller is already authorised.
 */
class AdminController
{
    // ── Questions ────────────────────────────────────────────────────────────

    /**
     * GET /admin/questions — return every question (active + inactive) with options.
     */
    public function listQuestions(): void
    {
        Response::json(['questions' => Question::getAll()]);
    }

    /**
     * POST /admin/questions — create a new question.
     *
     * Body: { question_key, text, sort_order? }
     */
    public function createQuestion(): void
    {
        $body      = json_decode(file_get_contents('php://input'), true) ?? [];
        $key       = trim($body['question_key'] ?? '');
        $text      = trim($body['text'] ?? '');
        $sortOrder = (int) ($body['sort_order'] ?? 0);

        if (!$key || !$text) {
            Response::error('question_key et text sont requis');
        }

        $newId = Question::create($key, $text, $sortOrder);
        Response::json(['id' => $newId], 201);
    }

    /**
     * PUT /admin/questions?id=X — update the text / sort order / active flag.
     *
     * Body: { text, sort_order, active }
     */
    public function updateQuestion(): void
    {
        $id        = (int) ($_GET['id'] ?? 0);
        $body      = json_decode(file_get_contents('php://input'), true) ?? [];
        $text      = trim($body['text'] ?? '');
        $sortOrder = (int) ($body['sort_order'] ?? 0);
        $active    = (bool) ($body['active'] ?? true);

        if (!$id || !$text) {
            Response::error('id et text sont requis');
        }

        Question::update($id, $text, $sortOrder, $active);
        Response::json(['ok' => true]);
    }

    /**
     * DELETE /admin/questions?id=X — hard delete with cascade on options/scores.
     */
    public function deleteQuestion(): void
    {
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) {
            Response::error('id requis');
        }
        Question::deleteById($id);
        Response::json(['ok' => true]);
    }

    // ── Formations ───────────────────────────────────────────────────────────

    /**
     * GET /admin/formations — return every formation (active + inactive).
     */
    public function listFormations(): void
    {
        Response::json(['formations' => Formation::getAll()]);
    }

    /**
     * POST /admin/formations — create a new formation.
     *
     * Body: { name, description?, contact_email?, contact_url? }
     */
    public function createFormation(): void
    {
        $body  = json_decode(file_get_contents('php://input'), true) ?? [];
        $name  = trim($body['name'] ?? '');
        // `?: null` turns an empty string into a real NULL in the DB,
        // keeping optional columns truly optional rather than empty-but-set.
        $desc  = trim($body['description'] ?? '') ?: null;
        $email = trim($body['contact_email'] ?? '') ?: null;
        $url   = trim($body['contact_url'] ?? '') ?: null;

        if (!$name) {
            Response::error('name est requis');
        }

        $newId = Formation::create($name, $desc, $email, $url);
        Response::json(['id' => $newId], 201);
    }

    /**
     * PUT /admin/formations?id=X — update every editable field.
     *
     * Body: { name, description?, contact_email?, contact_url?, active? }
     */
    public function updateFormation(): void
    {
        $id     = (int) ($_GET['id'] ?? 0);
        $body   = json_decode(file_get_contents('php://input'), true) ?? [];
        $name   = trim($body['name'] ?? '');
        $desc   = trim($body['description'] ?? '') ?: null;
        $email  = trim($body['contact_email'] ?? '') ?: null;
        $url    = trim($body['contact_url'] ?? '') ?: null;
        // Default to active=true when the key is missing (partial PATCH-style update).
        $active = isset($body['active']) ? (bool) $body['active'] : true;

        if (!$id || !$name) {
            Response::error('id et name sont requis');
        }

        Formation::update($id, $name, $desc, $email, $url, $active);
        Response::json(['ok' => true]);
    }

    /**
     * DELETE /admin/formations?id=X — hard delete (scores removed via cascade).
     */
    public function deleteFormation(): void
    {
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) {
            Response::error('id requis');
        }
        Formation::deleteById($id);
        Response::json(['ok' => true]);
    }

    // ── Export CSV ───────────────────────────────────────────────────────────

    /**
     * GET /admin/export — stream every answer of every user as a CSV attachment.
     *
     * Output is semicolon-separated with a UTF-8 BOM so Excel opens it with
     * the correct encoding and column split out-of-the-box.
     */
    public function exportCsv(): void
    {
        $pdo = Database::getInstance();

        // One row per answer; the JOIN gives us the username + completion date
        // alongside the question/answer pair.
        $rows = $pdo->query(
            'SELECT u.username, u.role, sr.completed_at,
                    ra.question_key, ra.question_text, ra.chosen_label
             FROM   survey_responses  sr
             JOIN   users             u  ON u.id  = sr.user_id
             JOIN   response_answers  ra ON ra.response_id = sr.id
             ORDER  BY sr.completed_at DESC, sr.id, ra.question_key'
        )->fetchAll();

        // Override the default JSON header set in api/index.php with CSV.
        header('Content-Type: text/csv; charset=utf-8', true);
        header('Content-Disposition: attachment; filename="reponses_' . date('Ymd_His') . '.csv"');

        $out = fopen('php://output', 'w');
        // UTF-8 BOM — required for Excel to detect the encoding on open.
        fwrite($out, "\xEF\xBB\xBF");
        fputcsv($out, ['Utilisateur', 'Rôle', 'Date', 'Question', 'Texte question', 'Réponse'], ';');

        foreach ($rows as $row) {
            fputcsv($out, [
                $row['username'],
                $row['role'],
                $row['completed_at'],
                $row['question_key'],
                $row['question_text'],
                $row['chosen_label'],
            ], ';');
        }

        fclose($out);
        exit;
    }
}

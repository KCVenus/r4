<?php
namespace App\Controllers;

use App\Core\Database;
use App\Core\Response;
use App\Models\Formation;
use App\Models\Question;

class AdminController
{
    // ── Questions ────────────────────────────────────────────────────────────

    public function listQuestions(): void
    {
        Response::json(['questions' => Question::getAll()]);
    }

    public function createQuestion(): void
    {
        $body      = json_decode(file_get_contents('php://input'), true) ?? [];
        $key       = trim($body['question_key'] ?? '');
        $text      = trim($body['text'] ?? '');
        $sortOrder = (int) ($body['sort_order'] ?? 0);

        if (!$key || !$text) {
            Response::error('question_key et text sont requis');
        }

        $id = Question::create($key, $text, $sortOrder);
        Response::json(['id' => $id], 201);
    }

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

    public function listFormations(): void
    {
        Response::json(['formations' => Formation::getAll()]);
    }

    public function createFormation(): void
    {
        $body  = json_decode(file_get_contents('php://input'), true) ?? [];
        $name  = trim($body['name'] ?? '');
        $desc  = trim($body['description'] ?? '') ?: null;
        $email = trim($body['contact_email'] ?? '') ?: null;
        $url   = trim($body['contact_url'] ?? '') ?: null;

        if (!$name) {
            Response::error('name est requis');
        }

        $id = Formation::create($name, $desc, $email, $url);
        Response::json(['id' => $id], 201);
    }

    public function updateFormation(): void
    {
        $id    = (int) ($_GET['id'] ?? 0);
        $body  = json_decode(file_get_contents('php://input'), true) ?? [];
        $name  = trim($body['name'] ?? '');
        $desc  = trim($body['description'] ?? '') ?: null;
        $email = trim($body['contact_email'] ?? '') ?: null;
        $url   = trim($body['contact_url'] ?? '') ?: null;
        $active = isset($body['active']) ? (bool) $body['active'] : true;

        if (!$id || !$name) {
            Response::error('id et name sont requis');
        }

        Formation::update($id, $name, $desc, $email, $url, $active);
        Response::json(['ok' => true]);
    }

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

    public function exportCsv(): void
    {
        $pdo = Database::getInstance();

        $rows = $pdo->query(
            'SELECT u.username, u.role, sr.completed_at,
                    ra.question_key, ra.question_text, ra.chosen_label
             FROM   survey_responses  sr
             JOIN   users             u  ON u.id  = sr.user_id
             JOIN   response_answers  ra ON ra.response_id = sr.id
             ORDER  BY sr.completed_at DESC, sr.id, ra.question_key'
        )->fetchAll();

        // Remplacement du header JSON déjà émis
        header('Content-Type: text/csv; charset=utf-8', true);
        header('Content-Disposition: attachment; filename="reponses_' . date('Ymd_His') . '.csv"');

        $out = fopen('php://output', 'w');
        // BOM UTF-8 pour compatibilité Excel
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

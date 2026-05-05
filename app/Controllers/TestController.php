<?php
namespace App\Controllers;

use App\Core\Response;
use App\Models\Test;

/**
 * Test controller — public list + admin/coordinator CRUD on tests.
 *
 * The admin/coordinator endpoints assume the role gate in api/index.php
 * has already validated the caller; only the body validation lives here.
 */
class TestController
{
    /**
     * GET /tests — public list of active tests for the questionnaire picker.
     */
    public function listPublic(): void
    {
        Response::json(['tests' => Test::getAllActive()]);
    }

    /**
     * GET /admin/tests — admin/coordinator list (active + inactive).
     */
    public function listAll(): void
    {
        Response::json(['tests' => Test::getAll()]);
    }

    /**
     * GET /admin/test?id=X — full editor payload for one test.
     */
    public function getOne(): void
    {
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) {
            Response::error('id requis');
        }
        $test = Test::getOneFull($id);
        if (!$test) {
            Response::error('Test introuvable', 404);
        }
        Response::json(['test' => $test]);
    }

    /**
     * POST /admin/tests — create a new test (metadata only, questions added next).
     *
     * Body: { slug, name, description? }
     * Slug is normalised: lowercased, only [a-z0-9-_], 2-50 chars.
     */
    public function create(): void
    {
        $body        = json_decode(file_get_contents('php://input'), true) ?? [];
        $slug        = strtolower(trim($body['slug'] ?? ''));
        $name        = trim($body['name'] ?? '');
        $description = trim($body['description'] ?? '') ?: null;

        if (!$name) {
            Response::error('Le nom est requis', 422);
        }
        if (!preg_match('/^[a-z0-9_-]{2,50}$/', $slug)) {
            Response::error('Slug invalide (2-50 car. : a-z, 0-9, -, _)', 422);
        }

        try {
            $newId = Test::create($slug, $name, $description, $_SESSION['user_id'] ?? null);
        } catch (\PDOException $e) {
            // 23000 = duplicate slug (UNIQUE key violation).
            if ($e->getCode() === '23000') {
                Response::error('Ce slug est déjà utilisé', 409);
            }
            throw $e;
        }
        Response::json(['id' => $newId], 201);
    }

    /**
     * PUT /admin/test?id=X — atomically save a test + its question list.
     *
     * Body: { name, description?, active, questions: [{question_id, sort_order}] }
     */
    public function save(): void
    {
        $id   = (int) ($_GET['id'] ?? 0);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        if (!$id) {
            Response::error('id requis');
        }
        if (trim($body['name'] ?? '') === '') {
            Response::error('Le nom est requis', 422);
        }

        Test::saveFull($id, $body);
        Response::json(['ok' => true]);
    }

    /**
     * DELETE /admin/tests?id=X — hard delete (pivot rows cascade).
     */
    public function delete(): void
    {
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) {
            Response::error('id requis');
        }
        Test::deleteById($id);
        Response::json(['ok' => true]);
    }
}

<?php
namespace App\Controllers;

use App\Core\Response;
use App\Models\Formation;
use App\Models\Question;

/**
 * Public question + formations catalogue controller.
 *
 * Both endpoints are unauthenticated: the questionnaire and the catalogue
 * are visible to guests; only persisting answers (POST /answers) requires
 * a session.
 */
class QuestionController
{
    /**
     * GET /questions — list active questions with their options.
     *
     * Accepts an optional `?test=<slug>` param to restrict to a specific
     * test variant (e.g. ?test=rapide for the 10-question short version,
     * ?test=complet for the full one). Missing or unknown slug → return
     * every active question (legacy fallback so older clients keep working).
     */
    public function index(): void
    {
        $slug = trim((string) ($_GET['test'] ?? ''));
        // Whitelist the slug shape so a malformed value can't be smuggled
        // into the SQL via the prepared statement (defence-in-depth).
        $testSlug = preg_match('/^[a-z0-9_-]{2,50}$/', $slug) ? $slug : null;
        Response::json(['questions' => Question::getActive($testSlug)]);
    }

    /**
     * GET /formations — list every active formation, ordered by level.
     *
     * Backs the catalogue section of the user account page (F9).
     */
    public function formations(): void
    {
        Response::json(['formations' => Formation::getAllActive()]);
    }
}

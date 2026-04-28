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
     */
    public function index(): void
    {
        Response::json(['questions' => Question::getActive()]);
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

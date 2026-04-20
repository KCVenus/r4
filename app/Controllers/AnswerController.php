<?php
namespace App\Controllers;

use App\Core\Response;
use App\Models\Survey;

/**
 * Answer controller — stores and retrieves completed questionnaire runs.
 *
 * Both endpoints require an authenticated user; guests get recommendations
 * from RecommendController but their answers are never persisted.
 */
class AnswerController
{
    /**
     * Enforce an authenticated session or terminate with 401.
     *
     * Kept private + simple because only two endpoints need it; promoting
     * it to a middleware would be overkill for this tiny router.
     */
    private function requireAuth(): void
    {
        if (!isset($_SESSION['user_id'])) {
            Response::error('Non authentifié', 401);
        }
    }

    /**
     * POST /answers — persist a full submission for the current user.
     *
     * Expected JSON body: { "answers": [ {question_key, question_text, chosen_value, chosen_label}, ... ] }
     */
    public function store(): void
    {
        $this->requireAuth();

        $body    = json_decode(file_get_contents('php://input'), true) ?? [];
        $answers = $body['answers'] ?? [];

        if (empty($answers) || !is_array($answers)) {
            Response::error('Aucune réponse fournie');
        }

        try {
            $responseId = Survey::save((int) $_SESSION['user_id'], $answers);
            Response::json(['id' => $responseId]);
        } catch (\Exception) {
            // Survey::save already rolled back the transaction on failure.
            Response::error('Erreur lors de la sauvegarde', 500);
        }
    }

    /**
     * GET /answers — return the most recent submission of the current user.
     *
     * Returns null inside the JSON payload if the user never completed the quiz.
     */
    public function last(): void
    {
        $this->requireAuth();
        Response::json(Survey::getLast((int) $_SESSION['user_id']));
    }
}

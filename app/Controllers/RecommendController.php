<?php
namespace App\Controllers;

use App\Core\Response;
use App\Models\Formation;

/**
 * Recommend controller — exposes the scoring engine to guests and logged-in users.
 *
 * Intentionally unauthenticated so visitors can see results without an account;
 * the "save" step (AnswerController::store) is what requires login.
 */
class RecommendController
{
    /**
     * POST /recommend — return the top formations matching the given answers.
     *
     * Expected JSON body: { "answers": [ {question_key, chosen_value, ...}, ... ] }
     */
    public function recommend(): void
    {
        $body    = json_decode(file_get_contents('php://input'), true) ?? [];
        $answers = $body['answers'] ?? [];

        if (empty($answers)) {
            Response::error('Aucune réponse fournie');
        }

        Response::json(['formations' => Formation::recommend($answers)]);
    }
}

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
     * Expected JSON body:
     *   {
     *     "answers":    [ {question_key, chosen_value, ...}, ... ],
     *     "user_level": 5|6|7|8   // optional study-level filter (F10)
     *   }
     *
     * `user_level` is normalised to one of {5, 6, 7, 8}; any other value
     * (including 0 = "sans diplôme" or missing) disables the filter so the
     * client gets the full recommendation set as before.
     */
    public function recommend(): void
    {
        $body    = json_decode(file_get_contents('php://input'), true) ?? [];
        $answers = $body['answers'] ?? [];

        if (empty($answers)) {
            Response::error('Aucune réponse fournie');
        }

        $rawLevel = isset($body['user_level']) ? (int) $body['user_level'] : 0;
        // Whitelist : only 5/6/7/8 enable the eligibility filter; anything
        // else means "show all", same UX as a guest who skipped the slider.
        $userLevel = in_array($rawLevel, [5, 6, 7, 8], true) ? $rawLevel : null;

        Response::json(['formations' => Formation::recommend($answers, $userLevel)]);
    }
}

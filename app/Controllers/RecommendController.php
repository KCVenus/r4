<?php
namespace App\Controllers;

use App\Core\Response;
use App\Models\Formation;

class RecommendController
{
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

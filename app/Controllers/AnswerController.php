<?php
namespace App\Controllers;

use App\Core\Response;
use App\Models\Survey;

class AnswerController
{
    private function requireAuth(): void
    {
        if (!isset($_SESSION['user_id'])) {
            Response::error('Non authentifié', 401);
        }
    }

    public function store(): void
    {
        $this->requireAuth();

        $body    = json_decode(file_get_contents('php://input'), true) ?? [];
        $answers = $body['answers'] ?? [];

        if (empty($answers) || !is_array($answers)) {
            Response::error('Aucune réponse fournie');
        }

        try {
            $id = Survey::save((int) $_SESSION['user_id'], $answers);
            Response::json(['id' => $id]);
        } catch (\Exception) {
            Response::error('Erreur lors de la sauvegarde', 500);
        }
    }

    public function last(): void
    {
        $this->requireAuth();
        Response::json(Survey::getLast((int) $_SESSION['user_id']));
    }
}

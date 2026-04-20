<?php
namespace App\Controllers;

use App\Core\Response;
use App\Models\Question;

/**
 * Public question controller — only exposes active questions to the frontend.
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
}

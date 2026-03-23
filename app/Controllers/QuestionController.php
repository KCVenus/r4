<?php
namespace App\Controllers;

use App\Core\Response;
use App\Models\Question;

class QuestionController
{
    public function index(): void
    {
        Response::json(['questions' => Question::getActive()]);
    }
}

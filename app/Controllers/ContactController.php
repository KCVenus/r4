<?php
namespace App\Controllers;

use App\Core\Mailer;
use App\Core\Response;
use App\Models\Formation;

/**
 * POST /api/contact — handle the post-test contact form (F3 + F6).
 *
 * Receives a JSON payload with the visitor's identity, the target formation
 * id and a free-text message; sends the email via SMTP to the formation's
 * contact_email if set, or to the configured fallback inbox otherwise.
 *
 * Rate-limited per session (3 sends per 5 minutes) so a logged-in user or
 * a guest with a session cookie can't spam the relay.
 */
class ContactController
{
    /**
     * Handle the form submission.
     *
     * Validation order: payload shape -> formation exists -> field lengths ->
     * email format -> rate limit -> SMTP send. The strict ordering matters
     * because the rate-limit counter only ticks once we know the request is
     * worth answering (otherwise typos would burn the quota).
     */
    public function send(): never
    {
        $payload = json_decode(file_get_contents('php://input'), true);
        if (!is_array($payload)) {
            Response::error('Payload invalide', 400);
        }

        $formationId = isset($payload['formation_id']) ? (int) $payload['formation_id'] : 0;
        $name        = trim((string)($payload['name']    ?? ''));
        $email       = trim((string)($payload['email']   ?? ''));
        $message     = trim((string)($payload['message'] ?? ''));

        if ($formationId <= 0 || $name === '' || $email === '' || $message === '') {
            Response::error('Tous les champs sont requis', 400);
        }
        // Length caps: keep email subjects short, prevent absurd payloads.
        if (mb_strlen($name) > 100 || mb_strlen($email) > 254 || mb_strlen($message) > 2000) {
            Response::error('Champ trop long', 400);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Adresse email invalide', 400);
        }

        $formation = Formation::getActiveById($formationId);
        if ($formation === null) {
            Response::error('Formation introuvable', 404);
        }

        // Per-session rate limit — same shape as AuthController for consistency.
        // 3 sends per 5 minutes is generous for legitimate use, restrictive for spam.
        $rateLimit = $_SESSION['_contact_rl'] ?? ['count' => 0, 'until' => 0];
        if ($rateLimit['until'] > time()) {
            Response::error('Trop de demandes. Réessayez dans quelques minutes.', 429);
        }

        // Strip CR/LF from the name to defend against header injection,
        // even though PHPMailer also escapes — defense in depth.
        $cleanName = str_replace(["\r", "\n"], '', $name);

        $cfg       = require __DIR__ . '/../../config/config.php';
        $recipient = !empty($formation['contact_email'])
            ? $formation['contact_email']
            : $cfg['mail_fallback_to'];

        $subject = "[R4] Demande de contact — {$formation['name']}";
        $body    = "Nouvelle demande de contact via le test d'orientation R4.\n\n"
                 . "Formation : {$formation['name']}\n"
                 . "Nom       : {$cleanName}\n"
                 . "Email     : {$email}\n"
                 . "Date      : " . date('d/m/Y H:i:s') . "\n\n"
                 . "Message :\n{$message}\n";

        try {
            $sent = Mailer::send($recipient, $subject, $body, $email, $cleanName);
        } catch (\RuntimeException $e) {
            // SMTP creds missing — surface a 503 so ops/devs see it's a
            // configuration issue, not a transient failure.
            if ($e->getMessage() === 'mail_disabled') {
                Response::error('Service mail temporairement indisponible', 503);
            }
            throw $e;
        }

        if (!$sent) {
            Response::error("Echec de l'envoi du message", 502);
        }

        // Tick the counter only after a successful send so legitimate users
        // who hit a transient SMTP error aren't penalised.
        $rateLimit['count']++;
        if ($rateLimit['count'] >= 3) {
            $rateLimit['until'] = time() + 300;
            $rateLimit['count'] = 0;
        }
        $_SESSION['_contact_rl'] = $rateLimit;

        Response::json(['ok' => true]);
    }
}

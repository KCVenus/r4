<?php
namespace App\Core;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

/**
 * Thin wrapper around PHPMailer that pre-configures the SMTP transport
 * from /config/config.php and exposes a single send() entry point.
 *
 * Goal: keep PHPMailer out of the controllers so the rest of the codebase
 * doesn't depend on a specific mail library.
 */
class Mailer
{
    /**
     * Build a PHPMailer instance ready to send via the configured SMTP server.
     *
     * Throws \RuntimeException when SMTP credentials are missing — that's a
     * 503 condition (mail temporarily disabled), not a 500.
     *
     * @return PHPMailer Configured transport with SMTPS encryption.
     */
    private static function transport(): PHPMailer
    {
        $cfg = require __DIR__ . '/../../config/config.php';

        if ($cfg['smtp_user'] === '' || $cfg['smtp_pass'] === '') {
            throw new \RuntimeException('mail_disabled');
        }

        // `true` = throw exceptions instead of returning false on failure.
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host       = $cfg['smtp_host'];
        $mail->Port       = $cfg['smtp_port'];
        $mail->SMTPAuth   = true;
        $mail->Username   = $cfg['smtp_user'];
        $mail->Password   = $cfg['smtp_pass'];
        // ENCRYPTION_SMTPS = implicit TLS on port 465 (OVH default).
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mail->CharSet    = 'UTF-8';
        $mail->setFrom($cfg['smtp_user'], $cfg['smtp_from_name']);

        return $mail;
    }

    /**
     * Send a plain-text email.
     *
     * Reply-To is set to the visitor's address so the formation can hit
     * "reply" and reach the user directly, rather than landing on the SMTP
     * mailbox.
     *
     * @param string $to        Recipient address (formation contact, or fallback).
     * @param string $subject   Subject line, will be UTF-8 encoded.
     * @param string $body      Plain-text body (no HTML).
     * @param string $replyTo   Visitor email used for Reply-To.
     * @param string $replyName Visitor display name for Reply-To.
     * @return bool True on send, false on PHPMailer transport failure.
     * @throws \RuntimeException When SMTP is not configured (mail_disabled).
     */
    public static function send(
        string $to,
        string $subject,
        string $body,
        string $replyTo,
        string $replyName,
    ): bool {
        try {
            $mail = self::transport();
            $mail->addAddress($to);
            $mail->addReplyTo($replyTo, $replyName);
            $mail->Subject = $subject;
            $mail->Body    = $body;
            $mail->send();
            return true;
        } catch (PHPMailerException) {
            // Caller only needs a boolean; PHPMailer's ErrorInfo stays in
            // server logs for ops debugging.
            return false;
        }
    }
}

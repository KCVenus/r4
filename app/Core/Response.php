<?php
namespace App\Core;

/**
 * Small helper that centralises every JSON response sent by the API.
 *
 * Both methods use the `never` return type: they call exit() so the caller
 * can rely on the fact that execution stops immediately.
 */
class Response
{
    /**
     * Send a JSON-encoded payload and terminate the script.
     *
     * @param mixed $data   Any value that json_encode can serialise.
     * @param int   $status HTTP status code (default 200).
     */
    public static function json(mixed $data, int $status = 200): never
    {
        http_response_code($status);
        echo json_encode($data);
        exit;
    }

    /**
     * Send a standard { "error": ... } payload and terminate.
     *
     * @param string $message Human-readable message shown to the client.
     * @param int    $status  HTTP status code (default 400 Bad Request).
     */
    public static function error(string $message, int $status = 400): never
    {
        self::json(['error' => $message], $status);
    }
}

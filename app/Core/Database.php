<?php
namespace App\Core;

use PDO;

/**
 * Singleton wrapper around a single PDO connection.
 *
 * Keeps only one MySQL connection alive for the whole request lifecycle,
 * which avoids opening a new socket on every model call.
 */
class Database
{
    /**
     * Cached PDO instance. Null until the first getInstance() call.
     */
    private static ?PDO $instance = null;

    /**
     * Return the shared PDO connection, creating it on first call.
     *
     * Config is loaded lazily from /config/config.php so the file is only
     * read when the DB is actually needed (e.g. not for the 404 route).
     *
     * @return PDO Configured PDO instance with exceptions + assoc fetch + real prepares.
     */
    public static function getInstance(): PDO
    {
        if (self::$instance === null) {
            $cfg = require __DIR__ . '/../../config/config.php';
            $dsn = "mysql:host={$cfg['db_host']};dbname={$cfg['db_name']};charset={$cfg['db_charset']}";

            // EMULATE_PREPARES=false forces native prepared statements — safer against
            // SQL injection and gives correct integer/null types back from MySQL.
            self::$instance = new PDO($dsn, $cfg['db_user'], $cfg['db_pass'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        }

        return self::$instance;
    }
}

-- ============================================================
--  r4 — Migration v2 : questions en BDD + formations
--  À importer APRÈS schema.sql
-- ============================================================

USE `r4_survey`;

-- ── Questions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `questions` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `question_key` VARCHAR(50)  NOT NULL,
  `text`         TEXT         NOT NULL,
  `sort_order`   INT          NOT NULL DEFAULT 0,
  `active`       TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_question_key` (`question_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Options de chaque question ────────────────────────────────
CREATE TABLE IF NOT EXISTS `question_options` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `question_id` INT UNSIGNED NOT NULL,
  `value`       VARCHAR(50)  NOT NULL,
  `label`       VARCHAR(255) NOT NULL,
  `sort_order`  INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_opt_question`
    FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Formations proposées par l'établissement ──────────────────
CREATE TABLE IF NOT EXISTS `formations` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(255) NOT NULL,
  `description`   TEXT,
  `contact_email` VARCHAR(255) DEFAULT NULL,
  `contact_url`   VARCHAR(500) DEFAULT NULL,
  `active`        TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Scoring : chaque option donne des points à des formations ─
CREATE TABLE IF NOT EXISTS `formation_scores` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `option_id`    INT UNSIGNED NOT NULL,
  `formation_id` INT UNSIGNED NOT NULL,
  `points`       INT          NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_score_option`
    FOREIGN KEY (`option_id`)    REFERENCES `question_options` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_score_formation`
    FOREIGN KEY (`formation_id`) REFERENCES `formations`       (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

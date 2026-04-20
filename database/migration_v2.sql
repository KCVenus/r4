-- ============================================================
--  r4 — Migration v2 : questions en BDD + formations
--  À importer APRÈS schema.sql
--  Adds the scoring engine tables: questions, options, formations, scores.
-- ============================================================

USE `r4_survey`;

-- ── Questions ─────────────────────────────────────────────────
-- question_key is the stable string id exposed to the frontend and stored
-- in response_answers; the numeric id is private to the DB.
CREATE TABLE IF NOT EXISTS `questions` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `question_key` VARCHAR(50)  NOT NULL,
  `text`         TEXT         NOT NULL,
  `sort_order`   INT          NOT NULL DEFAULT 0,
  `active`       TINYINT(1)   NOT NULL DEFAULT 1, -- soft-disable toggle
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_question_key` (`question_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Options de chaque question ────────────────────────────────
-- Each question has N options; the (value, label) pair is what we score
-- against (value) and what we display (label).
CREATE TABLE IF NOT EXISTS `question_options` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `question_id` INT UNSIGNED NOT NULL,
  `value`       VARCHAR(50)  NOT NULL,
  `label`       VARCHAR(255) NOT NULL,
  `sort_order`  INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  -- CASCADE: deleting a question removes its options automatically,
  -- simplifying the admin "delete question" flow.
  CONSTRAINT `fk_opt_question`
    FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Formations proposées par l'établissement ──────────────────
-- Destination of the recommendation engine. `active = 0` hides a formation
-- without destroying its historical score data.
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
-- Pivot table used by Formation::recommend(). Each row says:
-- "picking option X adds N points to formation Y".
CREATE TABLE IF NOT EXISTS `formation_scores` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `option_id`    INT UNSIGNED NOT NULL,
  `formation_id` INT UNSIGNED NOT NULL,
  `points`       INT          NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  -- CASCADE on both sides so removing a question/option or a formation
  -- never leaves dangling score rows.
  CONSTRAINT `fk_score_option`
    FOREIGN KEY (`option_id`)    REFERENCES `question_options` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_score_formation`
    FOREIGN KEY (`formation_id`) REFERENCES `formations`       (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

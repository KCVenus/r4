-- ============================================================
--  r4 Survey App — Database Schema
--  1. Import this file in phpMyAdmin
--  2. Then run setup.php once to create default users
-- ============================================================

-- Top-level DB — utf8mb4 so emojis + full Unicode work in user content.
CREATE DATABASE IF NOT EXISTS `r4_survey`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `r4_survey`;

-- ── Users ────────────────────────────────────────────────────
-- Accounts with role-based authorization (user vs admin).
-- password_hash stores the bcrypt output from PHP's password_hash().
CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `username`      VARCHAR(50)     NOT NULL,
  `email`         VARCHAR(255)    DEFAULT NULL,
  `password_hash` VARCHAR(255)    NOT NULL,
  `role`          ENUM('user','admin') NOT NULL DEFAULT 'user',
  `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  -- Login flow relies on username uniqueness; email is optional but also unique when present.
  UNIQUE KEY `uq_username` (`username`),
  UNIQUE KEY `uq_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Survey responses (one row per completed survey) ──────────
-- Header table: one submission per user per run. The individual answers
-- live in response_answers to keep this row small.
CREATE TABLE IF NOT EXISTS `survey_responses` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`      INT UNSIGNED NOT NULL,
  `completed_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  -- CASCADE: removing a user purges their whole history.
  CONSTRAINT `fk_response_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Individual answers within a response ─────────────────────
-- We store both question_text and chosen_label verbatim so future edits
-- to the questions table never rewrite past answers in stats/export views.
CREATE TABLE IF NOT EXISTS `response_answers` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `response_id`   INT UNSIGNED NOT NULL,
  `question_key`  VARCHAR(50)  NOT NULL,   -- matches "id" field in questions.json
  `question_text` TEXT         NOT NULL,   -- snapshot of the question at answer time
  `chosen_value`  VARCHAR(100) NOT NULL,
  `chosen_label`  VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_response_id` (`response_id`),
  -- Speed up the distribution query in StatsController (GROUP BY question_key).
  KEY `idx_question_key` (`question_key`),
  CONSTRAINT `fk_answer_response`
    FOREIGN KEY (`response_id`) REFERENCES `survey_responses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

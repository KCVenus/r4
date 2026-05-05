-- ============================================================
--  r4 — Migration v8 : architecture multi-tests
--
--  Remplace le drapeau booléen `quick` (questions.quick = 0|1)
--  par une vraie table `tests` reliée aux questions via un
--  pivot `test_questions`. Permet de créer N tests de longueur
--  arbitraire (5, 10, 30, 100…) sans toucher au scoring.
--
--  Avant cette migration : 2 tests implicites (rapide / complet)
--  via le drapeau quick.
--  Après : 2 tests explicites seed dans `tests` (slug 'rapide' /
--  'complet'), composés à partir des données existantes. Les tests
--  ultérieurs créés depuis l'admin partagent le même pool de
--  questions et le même pondérage formation_scores.
--
--  Pré-requis : v7 appliquée (rôle coordinateur).
--
--  Ordre d'import :
--    install.sql + v2 + v3 + v4 + v5 + v6 + v7 + ce fichier
-- ============================================================

USE `r4_survey`;

-- ── 1. Table des tests ────────────────────────────────────────
-- slug = identifiant URL stable (utilisé comme query param).
-- created_by = utilisateur ayant créé le test (admin ou coordinateur),
-- nullable pour les tests seed historiques.
CREATE TABLE IF NOT EXISTS `tests` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug`        VARCHAR(50)  NOT NULL,
  `name`        VARCHAR(100) NOT NULL,
  `description` TEXT,
  `active`      TINYINT(1)   NOT NULL DEFAULT 1,
  `created_by`  INT UNSIGNED DEFAULT NULL,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_test_slug` (`slug`),
  CONSTRAINT `fk_test_creator`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. Pivot test ↔ question ──────────────────────────────────
-- sort_order indépendant par test : la même question peut figurer
-- en position 3 dans le test rapide et en position 17 dans le complet.
CREATE TABLE IF NOT EXISTS `test_questions` (
  `test_id`     INT UNSIGNED NOT NULL,
  `question_id` INT UNSIGNED NOT NULL,
  `sort_order`  INT          NOT NULL DEFAULT 1,
  PRIMARY KEY (`test_id`, `question_id`),
  KEY `idx_tq_question` (`question_id`),
  CONSTRAINT `fk_tq_test`
    FOREIGN KEY (`test_id`)     REFERENCES `tests` (`id`)     ON DELETE CASCADE,
  CONSTRAINT `fk_tq_question`
    FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_test_questions_sort_order` CHECK (`sort_order` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. Seed : reconstituer les deux tests existants ──────────
INSERT INTO `tests` (`slug`, `name`, `description`)
VALUES
  ('rapide',  'Test rapide',  'Une question par grand domaine. Idéal pour un premier aperçu (~3 min).'),
  ('complet', 'Test complet', 'Couverture détaillée + soft skills, pour un matching plus précis (~10 min).');

-- Test rapide : reprend toutes les questions actives marquées quick=1.
INSERT INTO `test_questions` (`test_id`, `question_id`, `sort_order`)
SELECT
  (SELECT `id` FROM `tests` WHERE `slug` = 'rapide'),
  `id`,
  `sort_order`
FROM `questions`
WHERE `active` = 1 AND `quick` = 1;

-- Test complet : toutes les questions actives.
INSERT INTO `test_questions` (`test_id`, `question_id`, `sort_order`)
SELECT
  (SELECT `id` FROM `tests` WHERE `slug` = 'complet'),
  `id`,
  `sort_order`
FROM `questions`
WHERE `active` = 1;

-- ── 4. Le drapeau quick devient redondant ─────────────────────
-- L'appartenance à un test est désormais représentée par le pivot.
ALTER TABLE `questions` DROP COLUMN `quick`;

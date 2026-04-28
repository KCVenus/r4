-- ============================================================
--  r4 Survey App — Script d'installation complet
--  Ordre : schéma → migration v2 → seed
--  Usage : importer une seule fois sur un serveur vierge
-- ============================================================

-- ── 1. Création de la base ───────────────────────────────────
CREATE DATABASE IF NOT EXISTS `r4_survey`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `r4_survey`;

-- ── 2. Table utilisateurs ────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `username`      VARCHAR(50)     NOT NULL,
  `email`         VARCHAR(255)    DEFAULT NULL,
  `password_hash` VARCHAR(255)    NOT NULL,
  `role`          ENUM('user','admin') NOT NULL DEFAULT 'user',
  `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_username` (`username`),
  UNIQUE KEY `uq_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. Réponses au questionnaire ─────────────────────────────
-- user_level = niveau scolaire choisi par l'utilisateur au début du test
-- (5=bac, 6=bac+2, 7=bac+3, 8=bac+5+, 0=sans diplôme). Utilisé pour
-- filtrer les formations éligibles (cf. F10 + scope-formations.md).
CREATE TABLE IF NOT EXISTS `survey_responses` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`      INT UNSIGNED NOT NULL,
  `user_level`   TINYINT UNSIGNED NULL,
  `completed_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `fk_response_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. Réponses individuelles ─────────────────────────────────
CREATE TABLE IF NOT EXISTS `response_answers` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `response_id`   INT UNSIGNED NOT NULL,
  `question_key`  VARCHAR(50)  NOT NULL,
  `question_text` TEXT         NOT NULL,
  `chosen_value`  VARCHAR(100) NOT NULL,
  `chosen_label`  VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_response_id` (`response_id`),
  KEY `idx_question_key` (`question_key`),
  CONSTRAINT `fk_answer_response`
    FOREIGN KEY (`response_id`) REFERENCES `survey_responses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. Questions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `questions` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `question_key` VARCHAR(50)  NOT NULL,
  `text`         TEXT         NOT NULL,
  `sort_order`   INT          NOT NULL DEFAULT 0,
  `active`       TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_question_key` (`question_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 6. Options de chaque question ────────────────────────────
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

-- ── 7. Formations ─────────────────────────────────────────────
-- level = niveau RNCP (5/6/7) utilisé par F10 pour filtrer les
-- formations éligibles selon le niveau scolaire de l'utilisateur.
CREATE TABLE IF NOT EXISTS `formations` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(255) NOT NULL,
  `description`   TEXT,
  `contact_email` VARCHAR(255) DEFAULT NULL,
  `contact_url`   VARCHAR(500) DEFAULT NULL,
  `active`        TINYINT(1)   NOT NULL DEFAULT 1,
  `level`         TINYINT UNSIGNED NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 8. Scoring ────────────────────────────────────────────────
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

-- ── 9. Données : formations CNAM PACA (18 retenues, cf. docs/scope-formations.md) ─
INSERT IGNORE INTO `formations`
  (`id`, `name`, `description`, `contact_email`, `contact_url`, `active`, `level`)
VALUES
-- Niveau 5 (bac)
(1, 'Certificat pro Développeur web junior',
   'Formation courte aux fondamentaux du développement web (HTML/CSS/JS, bases serveur). Code CNAM : CP6500A.',
   'paca@cnam.fr',
   'https://www.cnam-paca.fr/nos-formations/htt/certificat-professionnel-developpeur-web-junior',
   1, 5),
(2, 'RNCP Concepteur développeur de solutions informatiques',
   'Titre RNCP niveau 5 orienté développement applicatif et conception logicielle. Code CNAM : CRN0700A.',
   'paca@cnam.fr',
   'https://www.cnam-paca.fr/nos-formations/htt/rncp-niveau-5-concepteur-developpeur-de-solutions-informatiques',
   1, 5),
(3, 'CC Gestionnaire de Paye',
   'Certificat de compétence orienté gestion de la paie, droit social et logiciels RH. Code CNAM : CC11600A.',
   'paca@cnam.fr', NULL, 1, 5),
(4, 'CP Assistant comptable',
   'Certificat professionnel : tenue de comptes, déclarations fiscales courantes, paie de base. Code CNAM : CP0200A.',
   'paca@cnam.fr', NULL, 1, 5),
(5, 'RNCP Assistant de gestion',
   'Titre RNCP niveau 5 : appui administratif, suivi budgétaire, relation clients/fournisseurs. Code CNAM : CPN7300A.',
   'paca@cnam.fr', NULL, 1, 5),
-- Niveau 6 (bac+2)
(6, 'Licence Informatique (L3)',
   'Licence générale informatique L3 : algorithmique, bases de données, génie logiciel. Code CNAM : LG02501A.',
   'paca@cnam.fr',
   'https://www.cnam-paca.fr/nos-formations/htt/licence-generale-sciences-technologiesinformatique',
   1, 6),
(7, 'RNCP Responsable RH',
   'Titre RNCP niveau 6 : gestion des ressources humaines, recrutement, droit du travail. Code CNAM : CPN0400A.',
   'paca@cnam.fr', NULL, 1, 6),
(8, 'Licence Comptabilité Contrôle Audit',
   'Licence générale CCA L3 : comptabilité approfondie, fiscalité, contrôle de gestion. Code CNAM : LG03607A.',
   'paca@cnam.fr', NULL, 1, 6),
(9, 'Licence Commerce, vente et marketing (L3)',
   'Licence générale orientée commerce, négociation, marketing digital. Code CNAM : LG03606A.',
   'paca@cnam.fr', NULL, 1, 6),
(10, 'LP Gestion des organisations',
   'Licence professionnelle : pilotage opérationnel d''équipe, gestion de projet, management. Code CNAM : LG03601A.',
   'paca@cnam.fr', NULL, 1, 6),
(11, 'Licence Génie civil · Ingénierie du bâtiment',
   'Licence générale orientée bâtiment : structure, conduite de travaux, calculs. Code CNAM : LG03503A.',
   'paca@cnam.fr', NULL, 1, 6),
(12, 'Licence Électrotechnique et systèmes',
   'Licence générale L3 électrotechnique : énergie, automatisme, systèmes embarqués. Code CNAM : LG03903A.',
   'paca@cnam.fr', NULL, 1, 6),
(13, 'LP Gestion des établissements sanitaires et sociaux',
   'Licence professionnelle pour cadres intermédiaires du médico-social. Code CNAM : LP11502A.',
   'paca@cnam.fr', NULL, 1, 6),
-- Niveau 7 (bac+3)
(14, 'Ingénieur Informatique · Cybersécurité',
   'Diplôme d''ingénieur CNAM, parcours cybersécurité (bac+5). Code CNAM : CYC9106A.',
   'paca@cnam.fr',
   'https://www.cnam-paca.fr/nos-formations/htt/diplome-d-ingenieur-informatique-parcours-cybersecurite',
   1, 7),
(15, 'Ingénieur Informatique · Multimédia (Toulon, alternance)',
   'Diplôme d''ingénieur CNAM Multimédia · Expérience Interactive, ancré à Toulon en alternance. Code CNAM : ING6700A.',
   'paca@cnam.fr', NULL, 1, 7),
(16, 'Ingénieur Bâtiment',
   'Diplôme d''ingénieur CNAM en génie civil et bâtiment (bac+5). Code CNAM : CYC8301A.',
   'paca@cnam.fr', NULL, 1, 7),
(17, 'Ingénieur Génie électrique',
   'Diplôme d''ingénieur CNAM en génie électrique (bac+5). Code CNAM : CYC8801A.',
   'paca@cnam.fr', NULL, 1, 7),
(18, 'RNCP Manager de la chaîne logistique',
   'Titre RNCP niveau 7 : pilotage supply chain, transport, achats, distribution. Code CNAM : CPN2700A.',
   'paca@cnam.fr', NULL, 1, 7);

-- ── 10. Données : questions ───────────────────────────────────
INSERT IGNORE INTO `questions` (`id`, `question_key`, `text`, `sort_order`, `active`) VALUES
(1,  'q1',  'Vous aimez travailler avec des ordinateurs et la technologie ?',          1,  1),
(2,  'q2',  'Analyser des chiffres et des donnees vous attire-t-il ?',                  2,  1),
(3,  'q3',  'Creer des sites web ou des applications vous interesse-t-il ?',            3,  1),
(4,  'q4',  'Gerer des projets et organiser des equipes vous motive-t-il ?',            4,  1),
(5,  'q5',  'Etes-vous a l''aise avec la vente et le contact client ?',                 5,  1),
(6,  'q6',  'La cybersecurite et la protection des donnees vous passionnent-elles ?',   6,  1),
(7,  'q7',  'Creer des visuels, du design ou des contenus vous attire-t-il ?',          7,  1),
(8,  'q8',  'La comptabilite et la gestion financiere vous interessent-elles ?',        8,  1),
(9,  'q9',  'Preferez-vous travailler en equipe plutot qu''en autonomie ?',             9,  1),
(10, 'q10', 'Souhaitez-vous evoluer rapidement vers un poste de responsabilite ?',     10,  1);

-- ── 11. Données : options ─────────────────────────────────────
INSERT IGNORE INTO `question_options` (`id`, `question_id`, `value`, `label`, `sort_order`) VALUES
-- q1
(1,  1, 'oui', 'Oui', 1), (2,  1, 'non', 'Non', 2),
-- q2
(3,  2, 'oui', 'Oui', 1), (4,  2, 'non', 'Non', 2),
-- q3
(5,  3, 'oui', 'Oui', 1), (6,  3, 'non', 'Non', 2),
-- q4
(7,  4, 'oui', 'Oui', 1), (8,  4, 'non', 'Non', 2),
-- q5
(9,  5, 'oui', 'Oui', 1), (10, 5, 'non', 'Non', 2),
-- q6
(11, 6, 'oui', 'Oui', 1), (12, 6, 'non', 'Non', 2),
-- q7
(13, 7, 'oui', 'Oui', 1), (14, 7, 'non', 'Non', 2),
-- q8
(15, 8, 'oui', 'Oui', 1), (16, 8, 'non', 'Non', 2),
-- q9
(17, 9, 'equipe', 'En equipe',    1), (18, 9, 'seul', 'En autonomie', 2),
-- q10
(19, 10, 'oui', 'Oui', 1), (20, 10, 'non', 'Non', 2);

-- ── 12. Données : scoring (option → formation, cf. migration_v3_cnam.sql) ─
-- Formation IDs et thèmes :
--   1-5  niv 5 (CP web, RNCP CDSI, CC Paye, CP Compta, RNCP Assist gestion)
--   6-13 niv 6 (Licence Info, RH, LCCA, Commerce, LP Gestion, GC Bât, Élec, médico-social)
--   14-18 niv 7 (Ingés Cyber/Multimédia/Bât/Élec, Manager logistique)
-- option_id rappel : q1 oui=1 non=2 | q2 oui=3 | q3 oui=5 | q4 oui=7
--                    q5 oui=9 | q6 oui=11 | q7 oui=13 | q8 oui=15
--                    q9 equipe=17 seul=18 | q10 oui=19 non=20

INSERT IGNORE INTO `formation_scores` (`option_id`, `formation_id`, `points`) VALUES
-- q1 oui (tech)
(1, 1, 2), (1, 2, 2), (1, 6, 2), (1, 14, 3), (1, 15, 3),
-- q2 oui (chiffres)
(3, 3, 2), (3, 4, 3), (3, 5, 2), (3, 8, 3), (3, 18, 1),
-- q3 oui (web/apps)
(5, 1, 3), (5, 2, 3), (5, 6, 2), (5, 15, 2),
-- q4 oui (gestion projet/équipe)
(7, 5, 1), (7, 7, 3), (7, 10, 3), (7, 18, 3), (7, 14, 1), (7, 16, 2), (7, 17, 2),
-- q5 oui (vente)
(9, 9, 3),
-- q6 oui (cybersécurité)
(11, 14, 3), (11, 2, 1), (11, 17, 1),
-- q7 oui (design/visuel)
(13, 15, 3), (13, 1, 1),
-- q8 oui (compta/gestion fin)
(15, 4, 3), (15, 8, 3), (15, 3, 2), (15, 5, 1),
-- q9 équipe (managérial)
(17, 7, 1), (17, 10, 1), (17, 13, 1), (17, 18, 2), (17, 9, 1),
-- q9 autonomie (technique individuel)
(18, 1, 1), (18, 2, 1), (18, 4, 1), (18, 6, 1), (18, 14, 1), (18, 17, 1),
-- q10 oui (responsabilité/évolution)
(19, 7, 2), (19, 10, 2), (19, 14, 2), (19, 15, 1), (19, 16, 2), (19, 17, 2), (19, 18, 3),
-- q10 non (rester opérationnel)
(20, 1, 1), (20, 2, 1), (20, 4, 1), (20, 6, 1), (20, 11, 1), (20, 12, 1);

-- ── 13. Comptes par défaut ────────────────────────────────────
-- Mots de passe : user/user  et  admin/admin
-- IMPORTANT : supprimer ou modifier ces comptes avant mise en production !
INSERT IGNORE INTO `users` (`username`, `password_hash`, `role`) VALUES
  ('user',  '$2y$10$t10b4XzdXaZFnVwrze/oDedAV.iYJpJvg5SLasiLJW3NZpA3Dq5YK', 'user'),
  ('admin', '$2y$10$0UBklcTwmrqqaGvUTCOB2eF7H3ptZmGpnfq5/OMOqEyRM588CAc72', 'admin');

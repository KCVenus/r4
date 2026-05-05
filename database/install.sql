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
-- quick = 1 → la question fait partie du test rapide (10 questions
-- cross-domaines). Sinon, la question n'apparaît que dans le test
-- complet (30 questions). Cf. migration_v5_quick.sql.
CREATE TABLE IF NOT EXISTS `questions` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `question_key` VARCHAR(50)  NOT NULL,
  `text`         TEXT         NOT NULL,
  `sort_order`   INT          NOT NULL DEFAULT 1,
  `active`       TINYINT(1)   NOT NULL DEFAULT 1,
  `quick`        TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_question_key` (`question_key`),
  CONSTRAINT `chk_questions_sort_order` CHECK (`sort_order` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 6. Options de chaque question ────────────────────────────
-- Note: pas de CHECK sur question_options.sort_order — l'éditeur admin
-- assigne 0 au premier élément ajouté, et le scope du fix ne porte que
-- sur les positions de questions visibles côté UI utilisateur.
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

-- ── 10. Données : 30 questions thématiques (cf. migration_v4 + v5) ─
-- Le drapeau quick = 1 marque les 10 questions retenues pour le test
-- rapide (une par grand domaine pour garantir la couverture des 18
-- formations). Les autres (quick = 0) n'apparaissent que dans le test
-- complet.
INSERT IGNORE INTO `questions` (`id`, `question_key`, `text`, `sort_order`, `active`, `quick`) VALUES
-- Tech / dev / web / cyber / multimédia
(1,  'q1',  'Vous êtes à l''aise avec un ordinateur au quotidien (logiciels, fichiers, web) ?', 1,  1, 1),
(2,  'q2',  'Résoudre des problèmes logiques ou des énigmes vous attire ?',                     2,  1, 0),
(3,  'q3',  'Coder ou écrire des scripts vous intéresse ?',                                     3,  1, 1),
(4,  'q4',  'Concevoir des sites web ou des applications mobiles vous attire ?',                4,  1, 0),
(5,  'q5',  'La cybersécurité (protéger des données, comprendre les menaces) vous passionne ?', 5,  1, 1),
(6,  'q6',  'Le multimédia, la 3D, les jeux vidéo ou l''UX vous attirent ?',                    6,  1, 0),
-- Compta / paie / fin / gestion
(7,  'q7',  'Manipuler des tableurs et des chiffres au quotidien ne vous gêne pas ?',           7,  1, 0),
(8,  'q8',  'La comptabilité, la fiscalité et la TVA vous semblent intéressantes ?',            8,  1, 1),
(9,  'q9',  'Gérer la paie, les bulletins et le droit social vous attire ?',                    9,  1, 0),
(10, 'q10', 'Faire de l''audit ou du contrôle de gestion vous tente ?',                        10,  1, 0),
-- RH / management
(11, 'q11', 'Recruter, former et accompagner des collaborateurs vous motive ?',                11,  1, 1),
(12, 'q12', 'Planifier les ressources humaines et les besoins en compétences vous attire ?',   12,  1, 0),
(13, 'q13', 'Encadrer une équipe et prendre des décisions vous correspond ?',                  13,  1, 0),
-- Commerce / vente / marketing
(14, 'q14', 'Vous avez une fibre commerciale (négocier, convaincre) ?',                        14,  1, 1),
(15, 'q15', 'Le marketing, la stratégie de marque ou la pub vous attirent ?',                  15,  1, 0),
(16, 'q16', 'Le contact client direct vous est facile ?',                                      16,  1, 0),
-- BTP / génie civil
(17, 'q17', 'Visiter un chantier ou comprendre une structure de bâtiment vous intéresse ?',    17,  1, 1),
(18, 'q18', 'Lire des plans et calculer le dimensionnement de structures vous attire ?',       18,  1, 0),
-- Électrotechnique / systèmes
(19, 'q19', 'L''électricité, l''électronique ou l''automatisation vous fascinent ?',           19,  1, 1),
(20, 'q20', 'Concevoir des systèmes embarqués ou des moteurs électriques vous tente ?',        20,  1, 0),
-- Logistique / supply chain
(21, 'q21', 'Optimiser des flux (transport, stocks, achats) vous intéresse ?',                 21,  1, 1),
(22, 'q22', 'Piloter une chaîne logistique à l''échelle d''une grande entreprise vous attire ?', 22, 1, 0),
-- Médico-social
(23, 'q23', 'Travailler dans le secteur sanitaire, social ou médico-social vous motive ?',     23,  1, 1),
(24, 'q24', 'Encadrer une structure pour publics fragiles (EHPAD, foyers) vous parle ?',       24,  1, 0),
-- Style / soft skills / projection
(25, 'q25', 'Vous travaillez plutôt en équipe ou en autonomie ?',                              25,  1, 0),
(26, 'q26', 'La rigueur et la précision sont au cœur de votre façon de travailler ?',          26,  1, 0),
(27, 'q27', 'Vous vous décririez comme créatif et imaginatif ?',                               27,  1, 0),
(28, 'q28', 'Vous vous voyez plutôt sur un poste technique ou managérial ?',                   28,  1, 0),
(29, 'q29', 'Vous voulez évoluer rapidement vers des responsabilités ?',                       29,  1, 0),
(30, 'q30', 'Vous êtes prêt à reprendre des études longues (bac+5 type ingénieur) ?',          30,  1, 0);

-- ── 11. Données : 60 options ──────────────────────────────────
-- Toutes les questions sont binaires (oui/non) sauf q25 (équipe/autonomie)
-- et q28 (technique/managériale) qui capturent le style de travail.
INSERT IGNORE INTO `question_options` (`id`, `question_id`, `value`, `label`, `sort_order`) VALUES
(1,  1,  'oui', 'Oui', 1), (2,  1,  'non', 'Non', 2),
(3,  2,  'oui', 'Oui', 1), (4,  2,  'non', 'Non', 2),
(5,  3,  'oui', 'Oui', 1), (6,  3,  'non', 'Non', 2),
(7,  4,  'oui', 'Oui', 1), (8,  4,  'non', 'Non', 2),
(9,  5,  'oui', 'Oui', 1), (10, 5,  'non', 'Non', 2),
(11, 6,  'oui', 'Oui', 1), (12, 6,  'non', 'Non', 2),
(13, 7,  'oui', 'Oui', 1), (14, 7,  'non', 'Non', 2),
(15, 8,  'oui', 'Oui', 1), (16, 8,  'non', 'Non', 2),
(17, 9,  'oui', 'Oui', 1), (18, 9,  'non', 'Non', 2),
(19, 10, 'oui', 'Oui', 1), (20, 10, 'non', 'Non', 2),
(21, 11, 'oui', 'Oui', 1), (22, 11, 'non', 'Non', 2),
(23, 12, 'oui', 'Oui', 1), (24, 12, 'non', 'Non', 2),
(25, 13, 'oui', 'Oui', 1), (26, 13, 'non', 'Non', 2),
(27, 14, 'oui', 'Oui', 1), (28, 14, 'non', 'Non', 2),
(29, 15, 'oui', 'Oui', 1), (30, 15, 'non', 'Non', 2),
(31, 16, 'oui', 'Oui', 1), (32, 16, 'non', 'Non', 2),
(33, 17, 'oui', 'Oui', 1), (34, 17, 'non', 'Non', 2),
(35, 18, 'oui', 'Oui', 1), (36, 18, 'non', 'Non', 2),
(37, 19, 'oui', 'Oui', 1), (38, 19, 'non', 'Non', 2),
(39, 20, 'oui', 'Oui', 1), (40, 20, 'non', 'Non', 2),
(41, 21, 'oui', 'Oui', 1), (42, 21, 'non', 'Non', 2),
(43, 22, 'oui', 'Oui', 1), (44, 22, 'non', 'Non', 2),
(45, 23, 'oui', 'Oui', 1), (46, 23, 'non', 'Non', 2),
(47, 24, 'oui', 'Oui', 1), (48, 24, 'non', 'Non', 2),
(49, 25, 'equipe',     'En équipe',  1), (50, 25, 'autonomie', 'En autonomie', 2),
(51, 26, 'oui', 'Oui', 1), (52, 26, 'non', 'Non', 2),
(53, 27, 'oui', 'Oui', 1), (54, 27, 'non', 'Non', 2),
(55, 28, 'technique',  'Technique',  1), (56, 28, 'manageriale', 'Managérial', 2),
(57, 29, 'oui', 'Oui', 1), (58, 29, 'non', 'Non', 2),
(59, 30, 'oui', 'Oui', 1), (60, 30, 'non', 'Non', 2);

-- ── 12. Données : scoring v2 (cf. migration_v4_questions.sql) ─
-- Formation IDs (cf. section 9) :
--   1-5  niv 5  (CP Web, CDSI, Paye, Compta, Assist gestion)
--   6-13 niv 6  (L3 Info, RH, LCCA, Commerce, LP Gestion, GC Bât, Élec, médico)
--   14-18 niv 7 (Ingés Cyber/Multimédia/Bât/Élec, Manager logistique)
INSERT IGNORE INTO `formation_scores` (`option_id`, `formation_id`, `points`) VALUES
-- q1 oui (à l'aise informatique)
(1, 1, 2), (1, 2, 2), (1, 6, 2), (1, 14, 3), (1, 15, 3),
-- q2 oui (logique)
(3, 2, 2), (3, 6, 3), (3, 12, 1), (3, 14, 2), (3, 17, 1),
-- q3 oui (coder)
(5, 1, 3), (5, 2, 3), (5, 6, 3), (5, 14, 2), (5, 15, 2),
-- q4 oui (web/apps)
(7, 1, 3), (7, 2, 2), (7, 6, 1), (7, 15, 2),
-- q5 oui (cybersécurité)
(9, 14, 4), (9, 2, 1),
-- q6 oui (multimédia/jeux)
(11, 15, 4), (11, 1, 1),
-- q7 oui (tableurs/chiffres)
(13, 3, 2), (13, 4, 3), (13, 5, 2), (13, 8, 2), (13, 18, 1), (13, 10, 1),
-- q8 oui (compta/fiscalité)
(15, 4, 3), (15, 8, 3), (15, 5, 1),
-- q9 oui (paie/droit social)
(17, 3, 4), (17, 7, 1),
-- q10 oui (audit/contrôle)
(19, 8, 3), (19, 4, 2), (19, 5, 1),
-- q11 oui (recruter/former)
(21, 7, 3), (21, 10, 2), (21, 5, 1),
-- q12 oui (planif RH)
(23, 7, 3), (23, 5, 2), (23, 10, 1),
-- q13 oui (encadrer équipe)
(25, 10, 3), (25, 7, 2), (25, 18, 2), (25, 13, 1),
-- q14 oui (vente/négocier)
(27, 9, 4),
-- q15 oui (marketing)
(29, 9, 3),
-- q16 oui (contact client)
(31, 9, 2), (31, 7, 1),
-- q17 oui (chantier/bâtiment)
(33, 11, 3), (33, 16, 3),
-- q18 oui (plans/calculs)
(35, 16, 4), (35, 11, 2), (35, 17, 1),
-- q19 oui (élec/électronique)
(37, 12, 3), (37, 17, 3),
-- q20 oui (systèmes embarqués)
(39, 17, 4), (39, 12, 2),
-- q21 oui (flux logistique)
(41, 18, 3), (41, 5, 1),
-- q22 oui (supply chain)
(43, 18, 4),
-- q23 oui (sanitaire/social)
(45, 13, 4),
-- q24 oui (encadrement médico-soc)
(47, 13, 3), (47, 7, 1),
-- q25 équipe (managérial)
(49, 7, 1), (49, 10, 1), (49, 13, 1), (49, 18, 1), (49, 9, 1),
-- q25 autonomie (technique individuel)
(50, 1, 1), (50, 2, 1), (50, 4, 1), (50, 6, 1), (50, 14, 1), (50, 17, 1),
-- q26 oui (rigueur/précision)
(51, 4, 2), (51, 8, 2), (51, 14, 2), (51, 16, 1), (51, 17, 1), (51, 11, 1), (51, 12, 1),
-- q27 oui (créatif)
(53, 15, 3), (53, 1, 2),
-- q28 technique
(55, 1, 1), (55, 2, 1), (55, 6, 2), (55, 11, 1), (55, 12, 1), (55, 14, 2), (55, 15, 2), (55, 16, 2), (55, 17, 2),
-- q28 managérial
(56, 5, 1), (56, 7, 2), (56, 9, 1), (56, 10, 2), (56, 13, 1), (56, 18, 2),
-- q29 oui (évolution/responsabilité)
(57, 7, 2), (57, 10, 2), (57, 14, 2), (57, 15, 1), (57, 16, 2), (57, 17, 2), (57, 18, 3),
-- q29 non (rester opérationnel)
(58, 1, 1), (58, 2, 1), (58, 4, 1), (58, 6, 1), (58, 11, 1), (58, 12, 1),
-- q30 oui (études longues bac+5)
(59, 14, 3), (59, 15, 3), (59, 16, 3), (59, 17, 3), (59, 18, 2),
-- q30 non (formation courte)
(60, 1, 2), (60, 2, 1), (60, 3, 1), (60, 4, 1), (60, 5, 1);

-- ── 13. Comptes par défaut ────────────────────────────────────
-- Mots de passe : user/user  et  admin/admin
-- IMPORTANT : supprimer ou modifier ces comptes avant mise en production !
INSERT IGNORE INTO `users` (`username`, `password_hash`, `role`) VALUES
  ('user',  '$2y$10$t10b4XzdXaZFnVwrze/oDedAV.iYJpJvg5SLasiLJW3NZpA3Dq5YK', 'user'),
  ('admin', '$2y$10$0UBklcTwmrqqaGvUTCOB2eF7H3ptZmGpnfq5/OMOqEyRM588CAc72', 'admin');

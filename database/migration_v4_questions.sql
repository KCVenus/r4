-- ============================================================
--  r4 — Migration v4 : 30 questions thématiques + scoring v2
--
--  Étend le test pour gagner en précision (10 → 30 questions),
--  avec une couverture domaine par domaine des 18 formations
--  CNAM PACA. Les questions restent binaires pour conserver la
--  promesse "test à choix binaire" (cf. README) mais introduisent
--  deux questions à valeur non-oui/non (q25 équipe/seul, q28
--  technique/manager) pour capturer le style de travail.
--
--  Ordre d'import :
--    install.sql (v4 = état complet) OU
--    schema.sql + migration_v2.sql + migration_v3_cnam.sql + ce fichier
--
--  Effets :
--    - DELETE de toutes les questions actuelles (CASCADE wipe les
--      options puis les formation_scores liés). Les snapshots dans
--      response_answers sont préservés (ils ne pointent plus de FK).
--    - INSERT 30 nouvelles questions + 60 options + scoring rebâti.
-- ============================================================

USE `r4_survey`;

-- ── 1. Wipe questionnaire-side (CASCADE → options + scores) ───
DELETE FROM `questions`;
ALTER TABLE `questions`         AUTO_INCREMENT = 1;
ALTER TABLE `question_options`  AUTO_INCREMENT = 1;
ALTER TABLE `formation_scores`  AUTO_INCREMENT = 1;

-- ── 2. 30 questions (groupées par domaine pour un parcours fluide) ─
INSERT INTO `questions` (`id`, `question_key`, `text`, `sort_order`, `active`) VALUES
-- Tech / dev / web / cyber / multimédia
(1,  'q1',  'Vous êtes à l''aise avec un ordinateur au quotidien (logiciels, fichiers, web) ?', 1,  1),
(2,  'q2',  'Résoudre des problèmes logiques ou des énigmes vous attire ?',                     2,  1),
(3,  'q3',  'Coder ou écrire des scripts vous intéresse ?',                                     3,  1),
(4,  'q4',  'Concevoir des sites web ou des applications mobiles vous attire ?',                4,  1),
(5,  'q5',  'La cybersécurité (protéger des données, comprendre les menaces) vous passionne ?', 5,  1),
(6,  'q6',  'Le multimédia, la 3D, les jeux vidéo ou l''UX vous attirent ?',                    6,  1),
-- Compta / paie / fin / gestion
(7,  'q7',  'Manipuler des tableurs et des chiffres au quotidien ne vous gêne pas ?',           7,  1),
(8,  'q8',  'La comptabilité, la fiscalité et la TVA vous semblent intéressantes ?',            8,  1),
(9,  'q9',  'Gérer la paie, les bulletins et le droit social vous attire ?',                    9,  1),
(10, 'q10', 'Faire de l''audit ou du contrôle de gestion vous tente ?',                        10,  1),
-- RH / management
(11, 'q11', 'Recruter, former et accompagner des collaborateurs vous motive ?',                11,  1),
(12, 'q12', 'Planifier les ressources humaines et les besoins en compétences vous attire ?',   12,  1),
(13, 'q13', 'Encadrer une équipe et prendre des décisions vous correspond ?',                  13,  1),
-- Commerce / vente / marketing
(14, 'q14', 'Vous avez une fibre commerciale (négocier, convaincre) ?',                        14,  1),
(15, 'q15', 'Le marketing, la stratégie de marque ou la pub vous attirent ?',                  15,  1),
(16, 'q16', 'Le contact client direct vous est facile ?',                                      16,  1),
-- BTP / génie civil
(17, 'q17', 'Visiter un chantier ou comprendre une structure de bâtiment vous intéresse ?',    17,  1),
(18, 'q18', 'Lire des plans et calculer le dimensionnement de structures vous attire ?',       18,  1),
-- Électrotechnique / systèmes
(19, 'q19', 'L''électricité, l''électronique ou l''automatisation vous fascinent ?',           19,  1),
(20, 'q20', 'Concevoir des systèmes embarqués ou des moteurs électriques vous tente ?',        20,  1),
-- Logistique / supply chain
(21, 'q21', 'Optimiser des flux (transport, stocks, achats) vous intéresse ?',                 21,  1),
(22, 'q22', 'Piloter une chaîne logistique à l''échelle d''une grande entreprise vous attire ?', 22, 1),
-- Médico-social
(23, 'q23', 'Travailler dans le secteur sanitaire, social ou médico-social vous motive ?',     23,  1),
(24, 'q24', 'Encadrer une structure pour publics fragiles (EHPAD, foyers) vous parle ?',       24,  1),
-- Style / soft skills / projection
(25, 'q25', 'Vous travaillez plutôt en équipe ou en autonomie ?',                              25,  1),
(26, 'q26', 'La rigueur et la précision sont au cœur de votre façon de travailler ?',          26,  1),
(27, 'q27', 'Vous vous décririez comme créatif et imaginatif ?',                               27,  1),
(28, 'q28', 'Vous vous voyez plutôt sur un poste technique ou managérial ?',                   28,  1),
(29, 'q29', 'Vous voulez évoluer rapidement vers des responsabilités ?',                       29,  1),
(30, 'q30', 'Vous êtes prêt à reprendre des études longues (bac+5 type ingénieur) ?',          30,  1);

-- ── 3. 60 options (binaires, avec deux exceptions pour q25/q28) ─
INSERT INTO `question_options` (`id`, `question_id`, `value`, `label`, `sort_order`) VALUES
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
-- q25 — style équipe vs autonomie
(49, 25, 'equipe',    'En équipe',  1),
(50, 25, 'autonomie', 'En autonomie', 2),
(51, 26, 'oui', 'Oui', 1), (52, 26, 'non', 'Non', 2),
(53, 27, 'oui', 'Oui', 1), (54, 27, 'non', 'Non', 2),
-- q28 — orientation technique vs managériale
(55, 28, 'technique',  'Technique',  1),
(56, 28, 'manageriale', 'Managérial', 2),
(57, 29, 'oui', 'Oui', 1), (58, 29, 'non', 'Non', 2),
(59, 30, 'oui', 'Oui', 1), (60, 30, 'non', 'Non', 2);

-- ── 4. Scoring v2 — pondération option → formation ────────────
-- Formation IDs (cf. migration_v3_cnam.sql) :
--   1 CP Dev web | 2 RNCP CDSI | 3 CC Paye | 4 CP Compta | 5 RNCP Assist gestion
--   6 Licence Info L3 | 7 RNCP RH | 8 Licence CCA | 9 Licence Commerce
--   10 LP Gestion orgs | 11 Licence GC Bât | 12 Licence Élec | 13 LP médico-social
--   14 Ingé Cyber | 15 Ingé Multimédia | 16 Ingé Bât | 17 Ingé Élec | 18 Manager logistique
INSERT INTO `formation_scores` (`option_id`, `formation_id`, `points`) VALUES
-- q1 oui (à l'aise informatique) → toutes les info
(1, 1, 2), (1, 2, 2), (1, 6, 2), (1, 14, 3), (1, 15, 3),
-- q2 oui (logique) → dev/info/cyber/élec
(3, 2, 2), (3, 6, 3), (3, 12, 1), (3, 14, 2), (3, 17, 1),
-- q3 oui (coder) → CP web, CDSI, L3 info, ingé cyber, ingé multimédia
(5, 1, 3), (5, 2, 3), (5, 6, 3), (5, 14, 2), (5, 15, 2),
-- q4 oui (web/apps) → CP web, CDSI, multimédia
(7, 1, 3), (7, 2, 2), (7, 6, 1), (7, 15, 2),
-- q5 oui (cybersécurité) → ingé cyber + CDSI
(9, 14, 4), (9, 2, 1),
-- q6 oui (multimédia/jeux) → ingé multimédia + design-ish dev
(11, 15, 4), (11, 1, 1),
-- q7 oui (tableurs/chiffres) → tous compta/paie/gestion + LCCA + manager logistique
(13, 3, 2), (13, 4, 3), (13, 5, 2), (13, 8, 2), (13, 18, 1), (13, 10, 1),
-- q8 oui (compta/fiscalité) → CP Compta + LCCA + Assist gestion
(15, 4, 3), (15, 8, 3), (15, 5, 1),
-- q9 oui (paie/droit social) → CC Paye + RH
(17, 3, 4), (17, 7, 1),
-- q10 oui (audit/contrôle) → LCCA + CP Compta + Assist gestion
(19, 8, 3), (19, 4, 2), (19, 5, 1),
-- q11 oui (recruter/former) → RH + LP gestion + Assist gestion
(21, 7, 3), (21, 10, 2), (21, 5, 1),
-- q12 oui (planif RH) → RH + Assist gestion + LP gestion
(23, 7, 3), (23, 5, 2), (23, 10, 1),
-- q13 oui (encadrer équipe) → LP gestion + RH + manager logistique + médico-social
(25, 10, 3), (25, 7, 2), (25, 18, 2), (25, 13, 1),
-- q14 oui (vente/négocier) → Licence Commerce
(27, 9, 4),
-- q15 oui (marketing) → Licence Commerce
(29, 9, 3),
-- q16 oui (contact client) → Licence Commerce + RH
(31, 9, 2), (31, 7, 1),
-- q17 oui (chantier/bâtiment) → Licence GC + Ingé Bât
(33, 11, 3), (33, 16, 3),
-- q18 oui (plans/calculs) → Ingé Bât + Licence GC + Ingé Élec
(35, 16, 4), (35, 11, 2), (35, 17, 1),
-- q19 oui (élec/électronique) → Licence Élec + Ingé Élec
(37, 12, 3), (37, 17, 3),
-- q20 oui (systèmes embarqués) → Ingé Élec + Licence Élec
(39, 17, 4), (39, 12, 2),
-- q21 oui (flux logistique) → Manager logistique + Assist gestion
(41, 18, 3), (41, 5, 1),
-- q22 oui (supply chain grande échelle) → Manager logistique
(43, 18, 4),
-- q23 oui (sanitaire/social) → LP médico-social
(45, 13, 4),
-- q24 oui (encadrement médico-soc) → LP médico-social + RH
(47, 13, 3), (47, 7, 1),
-- q25 équipe → managériaux (RH, LP gestion, médico-soc, manager log, commerce)
(49, 7, 1), (49, 10, 1), (49, 13, 1), (49, 18, 1), (49, 9, 1),
-- q25 autonomie → techniques individuels (dev, compta, ingés solos)
(50, 1, 1), (50, 2, 1), (50, 4, 1), (50, 6, 1), (50, 14, 1), (50, 17, 1),
-- q26 oui (rigueur/précision) → compta/cyber/ingés/élec
(51, 4, 2), (51, 8, 2), (51, 14, 2), (51, 16, 1), (51, 17, 1), (51, 11, 1), (51, 12, 1),
-- q27 oui (créatif) → multimédia + dev web
(53, 15, 3), (53, 1, 2),
-- q28 technique → CP web, CDSI, L3 info, GC, Élec, ingés tech
(55, 1, 1), (55, 2, 1), (55, 6, 2), (55, 11, 1), (55, 12, 1), (55, 14, 2), (55, 15, 2), (55, 16, 2), (55, 17, 2),
-- q28 managérial → RH, LP gestion, manager logistique, assist gestion, commerce, médico
(56, 5, 1), (56, 7, 2), (56, 9, 1), (56, 10, 2), (56, 13, 1), (56, 18, 2),
-- q29 oui (évolution/responsabilité) → niv 7 + LP gestion + RH
(57, 7, 2), (57, 10, 2), (57, 14, 2), (57, 15, 1), (57, 16, 2), (57, 17, 2), (57, 18, 3),
-- q29 non (rester opérationnel) → niv 5/6 techniques
(58, 1, 1), (58, 2, 1), (58, 4, 1), (58, 6, 1), (58, 11, 1), (58, 12, 1),
-- q30 oui (études longues bac+5) → tous les niv 7
(59, 14, 3), (59, 15, 3), (59, 16, 3), (59, 17, 3), (59, 18, 2),
-- q30 non (formation courte) → niv 5
(60, 1, 2), (60, 2, 1), (60, 3, 1), (60, 4, 1), (60, 5, 1);

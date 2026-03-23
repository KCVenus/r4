-- ============================================================
--  r4 — Seed v2 : questions FR + formations exemple
--  A adapter avec vos vraies formations et coordonnees
-- ============================================================

USE `r4_survey`;

-- ── Formations (à personnaliser) ──────────────────────────────
INSERT IGNORE INTO `formations` (`id`, `name`, `description`, `contact_email`, `contact_url`, `active`) VALUES
(1, 'BTS SIO - Informatique',
   'Formation aux metiers du developpement web, de la cybersecurite et des reseaux. Deux options : SLAM (developpement) ou SISR (reseaux).',
   'sio@monecole.fr', NULL, 1),

(2, 'Cybersecurite & Reseaux',
   'Specialisation dans la protection des systemes d''information, la gestion des incidents et la securisation des infrastructures.',
   'cyber@monecole.fr', NULL, 1),

(3, 'BTS MCO - Commerce',
   'Management Commercial Operationnel : vente, relation client, gestion d''unite commerciale et animation d''equipe.',
   'mco@monecole.fr', NULL, 1),

(4, 'BTS CG - Comptabilite & Gestion',
   'Comptabilite, paie, fiscalite et controle de gestion. Formation ideale pour integrer un cabinet comptable ou le service financier d''une entreprise.',
   'cg@monecole.fr', NULL, 1),

(5, 'BTS Design Graphique & Communication',
   'Creation visuelle, identite de marque, motion design et communication digitale. Pour les profils creatifs et visuels.',
   'design@monecole.fr', NULL, 1);

-- ── Questions ─────────────────────────────────────────────────
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

-- ── Options des questions ─────────────────────────────────────
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

-- ── Scoring : option → points par formation ───────────────────
-- formation IDs : 1=SIO  2=Cyber  3=MCO  4=CG  5=Design

INSERT IGNORE INTO `formation_scores` (`option_id`, `formation_id`, `points`) VALUES
-- q1 oui (tech) → SIO +3, Cyber +2
(1,  1, 3), (1,  2, 2),
-- q1 non → MCO +1, CG +1
(2,  3, 1), (2,  4, 1),

-- q2 oui (chiffres) → CG +3, SIO +1
(3,  4, 3), (3,  1, 1),

-- q3 oui (web/apps) → SIO +3
(5,  1, 3),

-- q4 oui (gestion projets) → MCO +2, SIO +1
(7,  3, 2), (7,  1, 1),

-- q5 oui (vente) → MCO +3
(9,  3, 3),
-- q5 non → SIO +1
(10, 1, 1),

-- q6 oui (cyber) → Cyber +3, SIO +1
(11, 2, 3), (11, 1, 1),

-- q7 oui (design) → Design +3
(13, 5, 3),

-- q8 oui (compta) → CG +3, MCO +1
(15, 4, 3), (15, 3, 1),

-- q9 equipe → MCO +1, Design +1
(17, 3, 1), (17, 5, 1),
-- q9 autonomie → SIO +1, CG +1
(18, 1, 1), (18, 4, 1),

-- q10 oui (responsabilite) → MCO +2, CG +1
(19, 3, 2), (19, 4, 1),
-- q10 non → SIO +1
(20, 1, 1);

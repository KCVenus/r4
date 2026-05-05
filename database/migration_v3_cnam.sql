-- ============================================================
--  r4 — Migration v3 : périmètre CNAM PACA + niveau utilisateur
--  À importer APRÈS migration_v2.sql (sur installations existantes).
--  Pour un déploiement vierge, install.sql v3 contient déjà tout.
--
--  Changements :
--   - Nouvelle colonne formations.level (5 / 6 / 7 RNCP)
--   - Nouvelle colonne survey_responses.user_level (0/5/6/7/8 — niveau
--     scolaire de l'utilisateur au moment du test, cf. F10)
--   - Remplacement complet du seed formations + scoring par les 18
--     formations CNAM PACA retenues (cf. docs/scope-formations.md)
-- ============================================================

USE `r4_survey`;

-- ── 1. Schéma : ajouter les colonnes manquantes ───────────────
-- À exécuter une fois sur une base v2 existante. install.sql v3
-- contient déjà ces colonnes pour les installations vierges.
ALTER TABLE `formations`
  ADD COLUMN `level` TINYINT UNSIGNED NULL AFTER `active`;

ALTER TABLE `survey_responses`
  ADD COLUMN `user_level` TINYINT UNSIGNED NULL AFTER `user_id`;

-- ── 2. Purger les formations existantes + leur scoring ────────
-- formation_scores a un FK CASCADE sur formations, donc supprimer
-- les formations entraîne le wipe des scores. On le fait quand
-- même explicitement pour rendre l'ordre lisible.
DELETE FROM `formation_scores`;
DELETE FROM `formations`;
ALTER TABLE `formations` AUTO_INCREMENT = 1;

-- ── 3. Insertion des 18 formations CNAM PACA ──────────────────
-- Source : docs/scope-formations.md (validé en réunion M1).
-- contact_email pointe vers la boîte régionale unique paca@cnam.fr ;
-- contact_url vers la fiche officielle (NULL quand pas de page web).
INSERT INTO `formations`
  (`id`, `name`, `description`, `contact_email`, `contact_url`, `active`, `level`)
VALUES
-- Niveau 5 (accessible bac)
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

-- Niveau 6 (accessible bac+2)
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

-- Niveau 7 (accessible bac+3)
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

-- ── 4. Scoring : pondération option → formation ───────────────
-- Approche pragmatique avec les 10 questions binaires existantes.
-- Pour chaque question/option, on ajoute des points aux formations
-- les plus alignées avec le thème. Le moteur Formation::recommend()
-- normalisera ensuite contre le score max pour afficher un pourcentage.
--
-- Rappel option_id (cf. seed v2) :
--   q1 oui=1  non=2  | q2 oui=3  non=4
--   q3 oui=5  non=6  | q4 oui=7  non=8
--   q5 oui=9  non=10 | q6 oui=11 non=12
--   q7 oui=13 non=14 | q8 oui=15 non=16
--   q9 equipe=17 seul=18 | q10 oui=19 non=20

INSERT INTO `formation_scores` (`option_id`, `formation_id`, `points`) VALUES
-- q1 oui (tech) → toutes les info
(1, 1, 2), (1, 2, 2), (1, 6, 2), (1, 14, 3), (1, 15, 3),
-- q2 oui (chiffres) → compta + paie + assist gestion + LCCA + responsable logistique
(3, 3, 2), (3, 4, 3), (3, 5, 2), (3, 8, 3), (3, 18, 1),
-- q3 oui (web/apps) → dev web + concepteur dev + L3 info + ingé multimédia
(5, 1, 3), (5, 2, 3), (5, 6, 2), (5, 15, 2),
-- q4 oui (gestion projet/équipe) → assist gestion + LP gestion orga + RH + manager logistique + ingés
(7, 5, 1), (7, 7, 3), (7, 10, 3), (7, 18, 3), (7, 14, 1), (7, 16, 2), (7, 17, 2),
-- q5 oui (vente) → licence commerce
(9, 9, 3),
-- q6 oui (cybersécurité) → ingé cyber + concepteur dev + ingé génie élec
(11, 14, 3), (11, 2, 1), (11, 17, 1),
-- q7 oui (design/visuel) → ingé multimédia + dev web (UI)
(13, 15, 3), (13, 1, 1),
-- q8 oui (compta/gestion fin) → CP compta + CCA + paie + assist gestion
(15, 4, 3), (15, 8, 3), (15, 3, 2), (15, 5, 1),
-- q9 équipe → managériaux (logistique, RH, LP gestion, médico-social, commerce)
(17, 7, 1), (17, 10, 1), (17, 13, 1), (17, 18, 2), (17, 9, 1),
-- q9 autonomie → métiers techniques individuels (dev, compta junior, ingés)
(18, 1, 1), (18, 2, 1), (18, 4, 1), (18, 6, 1), (18, 14, 1), (18, 17, 1),
-- q10 oui (responsabilité/évolution) → tous les niv 7 + LP gestion + RH
(19, 7, 2), (19, 10, 2), (19, 14, 2), (19, 15, 1), (19, 16, 2), (19, 17, 2), (19, 18, 3),
-- q10 non (rester opérationnel) → niv 5/6 techniques
(20, 1, 1), (20, 2, 1), (20, 4, 1), (20, 6, 1), (20, 11, 1), (20, 12, 1);

-- ── 5. Filets de sécurité ─────────────────────────────────────
-- Toutes les formations doivent avoir un level non-null pour que le
-- filtre F10 fonctionne. Vérification : aucune ligne ne doit remonter.
-- SELECT id, name FROM formations WHERE level IS NULL;

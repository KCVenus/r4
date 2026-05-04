-- ============================================================
--  r4 — Migration v5 : test rapide (10 questions) vs test complet (30)
--
--  Ajoute un drapeau `quick` sur les questions pour permettre à
--  l'utilisateur de choisir entre :
--    - test rapide (~3 min) : 10 questions cross-domaines
--    - test complet (~10 min) : les 30 questions thématiques
--
--  Aucune duplication de scoring : les questions du test rapide
--  sont un sous-ensemble strict des 30. Les pondérations existantes
--  s'appliquent telles quelles, donc les recommandations restent
--  cohérentes — moins précises sur 10 questions, mais alignées.
--
--  Ordre d'import :
--    install.sql (v5 = état complet) OU
--    migration_v2 + v3 + v4 + ce fichier
-- ============================================================

USE `r4_survey`;

-- ── 1. Schéma : ajouter le drapeau quick ──────────────────────
-- DEFAULT 0 : par défaut une question n'est pas dans le test rapide.
ALTER TABLE `questions`
  ADD COLUMN `quick` TINYINT(1) NOT NULL DEFAULT 0 AFTER `active`;

-- ── 2. Sélection des 10 questions du test rapide ──────────────
-- Critère : une question par grand domaine pour garantir que les
-- 18 formations CNAM PACA reçoivent au moins un signal exploitable.
--   q1  — tech base (toutes les info)
--   q3  — coder (dev / concepteur dev / L3 info / ingés cyber et multimédia)
--   q5  — cybersécurité (ingé cyber)
--   q8  — comptabilité / fiscalité (CP compta, LCCA, paie)
--   q11 — RH / recruter (RH, LP gestion, assist gestion)
--   q14 — vente (licence commerce)
--   q17 — chantier / bâtiment (licence GC, ingé bât)
--   q19 — électrotechnique (licence élec, ingé élec)
--   q21 — flux logistique (manager logistique)
--   q23 — sanitaire / social (LP médico-social)
UPDATE `questions` SET `quick` = 1
  WHERE `id` IN (1, 3, 5, 8, 11, 14, 17, 19, 21, 23);

-- Vérification : SELECT COUNT(*) FROM questions WHERE quick = 1; -- attend 10

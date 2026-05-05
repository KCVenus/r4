-- ============================================================
--  r4 — Migration v6 : contraintes CHECK sur les positions
--
--  Empêche au niveau DB les valeurs `sort_order` aberrantes que
--  l'application acceptait jusqu'ici (positions négatives ou
--  zéro). La validation applicative borne désormais aussi le haut
--  via Question::count() ; le CHECK ici n'est qu'une dernière
--  ligne de défense au cas où un client outrepasserait l'API.
--
--  Pré-requis : MySQL 8.0.16+ (CHECK constraints réellement
--  enforced). En deçà, la contrainte est ignorée silencieusement.
--
--  Données existantes : tous les seeds (install.sql, migration v3,
--  v4) utilisent sort_order >= 1, donc l'ajout du CHECK passe sans
--  violation.
--
--  Ordre d'import :
--    install.sql + v2 + v3 + v4 + v5 + ce fichier
-- ============================================================

USE `r4_survey`;

ALTER TABLE `questions`
  ADD CONSTRAINT `chk_questions_sort_order` CHECK (`sort_order` >= 1);

ALTER TABLE `question_options`
  ADD CONSTRAINT `chk_question_options_sort_order` CHECK (`sort_order` >= 1);

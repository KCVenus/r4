-- ============================================================
--  r4 — Migration v9 : conformité RGPD minimale
--
--  Ajoute la trace explicite du consentement à la politique de
--  confidentialité au moment de l'inscription. Permet de
--  répondre aux demandes d'audit (« quand cet utilisateur
--  a-t-il accepté la politique ? ») sans inférence indirecte.
--
--  - consent_at NULL → utilisateur historique inscrit avant
--    l'ajout de la case à cocher. Légal mais à régulariser.
--  - consent_at = timestamp → consentement explicite.
--
--  Les autres droits RGPD (effacement / portabilité) sont
--  servis par les endpoints DELETE /me et GET /me/export
--  ajoutés dans AuthController.
--
--  Ordre d'import :
--    install.sql + v2 + v3 + v4 + v5 + v6 + v7 + v8 + ce fichier
-- ============================================================

USE `r4_survey`;

ALTER TABLE `users`
  ADD COLUMN `consent_at` TIMESTAMP NULL DEFAULT NULL AFTER `created_at`;

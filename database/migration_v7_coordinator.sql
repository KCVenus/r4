-- ============================================================
--  r4 — Migration v7 : rôle « coordinateur(ice) de formation »
--
--  Ajoute un troisième rôle aux utilisateurs en plus de
--  user / admin. Le coordinateur peut éditer les questions et
--  leurs pondérations (futur : créer des tests spéciaux), mais
--  pas accéder aux statistiques nominatives, à la gestion des
--  formations ni à l'export CSV — seul l'admin garde ces droits.
--
--  Le contrôle d'accès est appliqué côté serveur dans
--  api/index.php (middleware par route) ; ce schéma se contente
--  d'élargir l'enum.
--
--  Données existantes : aucune ligne ne contient déjà
--  « coordinateur », donc l'ALTER passe sans conflit.
--
--  Pour promouvoir un utilisateur :
--    UPDATE users SET role = 'coordinateur' WHERE username = 'jeanne';
--
--  Ordre d'import :
--    install.sql + v2 + v3 + v4 + v5 + v6 + ce fichier
-- ============================================================

USE `r4_survey`;

ALTER TABLE `users`
  MODIFY `role` ENUM('user', 'admin', 'coordinateur') NOT NULL DEFAULT 'user';

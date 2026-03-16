-- ============================================================
--  r4 Survey App — Default users seed
--  Passwords: user/user  and  admin/admin
--  Run AFTER schema.sql
-- ============================================================

USE `r4_survey`;

INSERT IGNORE INTO `users` (`username`, `password_hash`, `role`) VALUES
  ('user',  '$2y$10$t10b4XzdXaZFnVwrze/oDedAV.iYJpJvg5SLasiLJW3NZpA3Dq5YK', 'user'),
  ('admin', '$2y$10$0UBklcTwmrqqaGvUTCOB2eF7H3ptZmGpnfq5/OMOqEyRM588CAc72', 'admin');

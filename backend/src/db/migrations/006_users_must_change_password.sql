-- Complementa 005_users_password.sql: cuando un administrador asigna una
-- contraseña (alta o restablecimiento), la persona debe cambiarla en su
-- próximo login en vez de quedarse con la temporal indefinidamente. No
-- aplica cuando alguien fija su propia contraseña (arranque de
-- BOOTSTRAP_ADMIN_EMAILS, o un cambio de contraseña ya hecho).
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Solución interina hasta integrar CAS/SSO institucional (ver comentario de
-- 004_users_correo_activo.sql): agrega contraseña para que el login deje de
-- confiar únicamente en que alguien conozca un correo ya aprovisionado.
-- Nullable a propósito: las cuentas ya existentes (aprovisionadas antes de
-- este cambio) quedan sin poder loguearse hasta que un administrador les
-- asigne una contraseña desde Admin.jsx -- no hay forma de migrar una
-- contraseña que nunca existió.
ALTER TABLE users ADD COLUMN password_hash TEXT;

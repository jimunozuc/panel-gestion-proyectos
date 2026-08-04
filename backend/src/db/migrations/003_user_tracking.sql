-- Rastrea el último login (para el listado de accesos en Administración).
-- "Última acción" no necesita columna propia: se deriva de audit_log
-- (MAX(created_at) por user_id) en el momento de la consulta.
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;

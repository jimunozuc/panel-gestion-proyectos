-- Migra la identidad de login de "nombre" a "correo": es la clave estable
-- que en el futuro validará CAS/SSO, y permite que un administrador asigne
-- un rol a una persona ANTES de que haya iniciado sesión alguna vez
-- (aprovisionamiento). Se asume la tabla vacía al correr esto (limpieza de
-- filas de prueba hecha aparte, ver backend/delete-test-user.mjs) -- por
-- eso no hay backfill: si la tabla no estuviera vacía, el NOT NULL sin
-- DEFAULT rechaza el ALTER y la transacción de migrate.js hace rollback
-- solo, sin dejar nada a medio aplicar.
ALTER TABLE users ADD COLUMN correo TEXT NOT NULL UNIQUE;

-- `nombre` deja de identificar a nadie -- pasa a ser un nombre para
-- mostrar (y el valor que Mi Perfil cruza contra `nodos.responsable`, ver
-- routes/perfil.js). Dos cuentas ya pueden compartirlo.
ALTER TABLE users DROP CONSTRAINT users_nombre_key;

-- Baja suave: reemplaza el borrado físico. No se puede hacer DELETE de una
-- cuenta que ya actuó -- audit_log.user_id y nodos.updated_by la
-- referencian sin ON DELETE CASCADE -- por eso "desactivar" en vez de
-- borrar. Toda cuenta nueva entra activa.
ALTER TABLE users ADD COLUMN activo BOOLEAN NOT NULL DEFAULT true;

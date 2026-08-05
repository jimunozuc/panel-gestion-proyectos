-- Corrige `nombre` para cuentas que quedaron con el correo como nombre de
-- pantalla: BOOTSTRAP_ADMIN_EMAILS aprovisiona en el primer login sin pedir
-- nombre (ver sesionServer.js, POST /internal/login), así que cae al
-- default `nombre || correo`. Sin esto, Mi Perfil (routes/perfil.js, cruza
-- `nombre` contra `nodos.responsable`) nunca encuentra las tareas de esa
-- persona -- mismo mecanismo que ya documenta 004_users_correo_activo.sql.
-- Por correo, no por id: aplica igual en cualquier esquema/entorno donde
-- exista esa cuenta (hoy `public` en /dev/, `app` en /app/); si el correo no
-- existe todavía en un esquema dado, el UPDATE no afecta ninguna fila.
UPDATE users SET nombre = 'José Ignacio Muñoz' WHERE correo = 'josemunoz@uc.cl';
UPDATE users SET nombre = 'Prueba' WHERE correo = 'ia@uc.cl';

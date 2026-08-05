// Uso: DATABASE_URL=... [DB_SCHEMA=...] node set-initial-passwords.mjs <contraseña>
//
// Arranque de la Versión 3.0.1 (ver README, ## Roadmap): las cuentas
// aprovisionadas antes de que existiera contraseña (migración
// 005_users_password.sql) quedaron con password_hash NULL, sin poder
// loguearse. Este script les asigna la MISMA contraseña temporal a todas
// las que sigan sin una, y marca must_change_password para que cada quien
// la reemplace por la suya en su próximo login -- no hace falta correrlo
// de nuevo para una cuenta que ya cambió la suya (ya no tiene
// password_hash NULL).
//
// SSL: mismo criterio que check-users-schema.mjs -- sin SSL contra
// localhost, laxo contra cualquier otro host (así sirve para apuntar a la
// Postgres real de Render con la misma DATABASE_URL que uses para inspeccionarla).
import pg from "pg";
import { hashPassword } from "./src/passwordHash.js";

const { Pool } = pg;

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error("Uso: node set-initial-passwords.mjs <contraseña de al menos 8 caracteres>");
  process.exit(1);
}

const isLocal = /(localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL || "");
const schema = process.env.DB_SCHEMA;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  ...(schema ? { options: `-c search_path=${schema},public` } : {}),
});

const { rows: db } = await pool.query(
  "SELECT current_database() AS db, current_setting('search_path') AS search_path"
);
console.log(`Conectado a: ${db[0].db} (search_path: ${db[0].search_path})`);

const passwordHash = await hashPassword(password);
const { rows } = await pool.query(
  `UPDATE users SET password_hash = $1, must_change_password = true
   WHERE password_hash IS NULL
   RETURNING id, correo, nombre, rol`,
  [passwordHash]
);

if (rows.length === 0) {
  console.log("Ninguna cuenta sin contraseña -- nada que hacer.");
} else {
  console.log(`${rows.length} cuenta(s) actualizadas (deberán cambiarla en su próximo login):`);
  for (const u of rows) console.log(`  - ${u.correo} (${u.rol})`);
}

await pool.end();

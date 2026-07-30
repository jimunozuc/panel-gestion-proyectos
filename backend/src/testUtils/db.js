// Helper compartido por los tests que tocan Postgres. Nunca deben correr
// contra la base de datos real de desarrollo (tiene datos migrados reales de
// P6.1.1/2/3) — por eso exigen TEST_DATABASE_URL, separada de DATABASE_URL,
// y fallan rápido si no está seteada en vez de asumir alguna por defecto.
if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL no está definida. Crea una base descartable " +
      "(ej. `createdb panel_test`) y expórtala como TEST_DATABASE_URL antes de correr los tests."
  );
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

// Import dinámico y no en el top del archivo a propósito: debe pasar
// DESPUÉS de fijar DATABASE_URL, porque pool.js lee process.env.DATABASE_URL
// al construir el Pool a nivel de módulo. Cualquier test que toque la base
// debe importar este archivo ANTES que cualquier módulo de la app.
const { pool } = await import("../db/pool.js");
const { runMigrations } = await import("../db/migrate.js");

export { pool };

export async function setupTestDb() {
  await runMigrations();
}

// Todos los archivos de test que tocan DB comparten la misma TEST_DATABASE_URL
// (no una por archivo) — si dos archivos corrieran en paralelo, el resetDb()
// de uno truncaría los datos que el otro tiene a mitad de un test. Por eso
// package.json corre los tests con --test-concurrency=1: los archivos se
// ejecutan de a uno, nunca en paralelo entre sí.
export async function resetDb() {
  await pool.query(
    "TRUNCATE nodos, audit_log, imported_sheets, users RESTART IDENTITY CASCADE"
  );
}

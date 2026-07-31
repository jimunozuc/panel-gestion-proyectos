import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const [, , schema, idArg, nombreEsperado] = process.argv;
const id = Number(idArg);
if (!schema || !id || !nombreEsperado) {
  console.error("Uso: node delete-test-user.mjs <schema> <id> <nombre-exacto-esperado>");
  process.exit(1);
}

const { rows } = await pool.query(`SELECT id, nombre, rol FROM "${schema}".users WHERE id = $1`, [id]);
const row = rows[0];
if (!row) {
  console.error(`No existe ${schema}.users con id ${id}. No se borró nada.`);
  process.exit(1);
}
if (row.nombre !== nombreEsperado) {
  console.error(`El nombre no coincide: esperaba "${nombreEsperado}", encontré "${row.nombre}". No se borró nada.`);
  process.exit(1);
}

try {
  await pool.query(`DELETE FROM "${schema}".users WHERE id = $1`, [id]);
  console.log("Borrado:", row);
} catch (err) {
  if (err.code === "23503") {
    console.error(
      `No se pudo borrar: esta fila ya tiene referencias en audit_log o nodos (alguien la usó para editar algo).\n` +
      `Alternativa más segura: bajarle el rol a 'lector' desde Admin en vez de borrarla, para no perder la bitácora.`
    );
  } else {
    console.error("Error:", err.message);
  }
  process.exit(1);
}
await pool.end();

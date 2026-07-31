import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const { rows: schemas } = await pool.query(`
  SELECT schema_name FROM information_schema.schemata
  WHERE schema_name NOT LIKE 'pg_%' AND schema_name != 'information_schema'
  ORDER BY 1
`);
console.log("Schemas visibles:", schemas.map((r) => r.schema_name).join(", ") || "(ninguno)");

for (const { schema_name } of schemas) {
  try {
    const { rows } = await pool.query(
      `SELECT id, nombre, rol, created_at FROM "${schema_name}".users ORDER BY id`
    );
    console.log(`  ${schema_name}.users -> ${rows.length} filas:`, rows);
  } catch {
    console.log(`  ${schema_name}.users -> no existe tabla users en este schema`);
  }
}

const { rows: sp } = await pool.query("SHOW search_path");
console.log("search_path de esta conexión:", sp[0].search_path);

const { rows: db } = await pool.query(
  "SELECT current_database() AS db, inet_server_addr()::text AS server_addr"
);
console.log("Conectado a:", db[0]);

await pool.end();

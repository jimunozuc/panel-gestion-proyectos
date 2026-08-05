import pg from "pg";

const { Pool } = pg;

const isProd = process.env.NODE_ENV === "production";

// Permite compartir una misma instancia de Postgres entre varios entornos
// (ej. /dev/ y /app/) aislando sus tablas por schema en vez de por base de
// datos, cuando el plan no permite crear más de una. Sin DB_SCHEMA, se usa
// el "public" de siempre — comportamiento sin cambios para quien no lo setee.
const schema = process.env.DB_SCHEMA;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProd ? { rejectUnauthorized: false } : false,
  ...(schema ? { options: `-c search_path=${schema},public` } : {}),
  // Sin estos tres, una conexión que se cuelga (Postgres lento o
  // inalcanzable de forma silenciosa, no caído) deja esperando para siempre
  // a quien pidió la query — por ejemplo attachUser() en cada request,
  // colgando el panel entero detrás de la pantalla de carga.
  // connectionTimeoutMillis cubre adquirir la conexión; statement_timeout
  // corta del lado de Postgres; query_timeout corta del lado del cliente si
  // ni eso responde.
  connectionTimeoutMillis: 5000,
  statement_timeout: 5000,
  query_timeout: 5000,
});

// Sin este listener, un error en un cliente inactivo del pool (reset de red,
// Postgres reiniciando) es un 'error' de EventEmitter sin handler — Node lo
// lanza como excepción no capturada y tumba el proceso completo (los 4
// servicios importan este mismo pool). Loguear y seguir vivo en su lugar.
pool.on("error", (err) => {
  console.error("Error en una conexión inactiva del pool de Postgres:", err.message);
});

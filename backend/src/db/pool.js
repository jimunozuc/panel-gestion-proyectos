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
});

// Importar testUtils/db ANTES que pool.js: fija DATABASE_URL=TEST_DATABASE_URL
// antes de que este módulo (importado transitivamente) abra la conexión.
import { pool } from "../testUtils/db.js";
import { test } from "node:test";
import assert from "node:assert/strict";

test("el pool no crashea si se emite un evento 'error' (conexión inactiva perdida)", () => {
  // Sin pool.on('error', ...) registrado en db/pool.js, EventEmitter lanza
  // sincrónicamente cuando nadie escucha 'error' — este assert falla si ese
  // listener se llega a quitar.
  assert.doesNotThrow(() => {
    pool.emit("error", new Error("simulado: conexión perdida"));
  });
});

test("el pool tiene timeouts configurados (no cuelga para siempre ante Postgres lento/inalcanzable)", () => {
  assert.ok(pool.options.connectionTimeoutMillis > 0, "connectionTimeoutMillis debe estar seteado");
  assert.ok(pool.options.statement_timeout > 0, "statement_timeout debe estar seteado");
  assert.ok(pool.options.query_timeout > 0, "query_timeout debe estar seteado");
});

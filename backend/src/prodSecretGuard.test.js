import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Prueba de caja negra: arranca cada entrypoint como proceso real (igual que
// npm start/start:ingesta/start:sesion/start:admin) para confirmar que
// rechaza servir tráfico en producción si falta su secreto, en vez de
// arrancar igual y quedar sin protección (docs/plan-pruebas.md, SEG-02/SEG-03).

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));

function runEntrypoint(file, envOverrides, waitMs = 2000) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(SRC_DIR, file)], {
      env: { ...process.env, ...envOverrides },
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    const timeout = setTimeout(() => {
      child.kill();
      resolve({ code: null, stderr, timedOut: true });
    }, waitMs);
    child.on("exit", (code) => {
      clearTimeout(timeout);
      resolve({ code, stderr, timedOut: false });
    });
  });
}

test("server.js rechaza arrancar en producción sin COOKIE_SECRET", async () => {
  const { code, stderr, timedOut } = await runEntrypoint("server.js", {
    NODE_ENV: "production",
    COOKIE_SECRET: "",
    PORT: "0",
  });
  assert.equal(timedOut, false, "debe abortar antes de escuchar, no seguir vivo");
  assert.equal(code, 1);
  assert.match(stderr, /COOKIE_SECRET/);
});

test("ingestaServer.js rechaza arrancar en producción sin REFRESH_SECRET", async () => {
  const { code, stderr, timedOut } = await runEntrypoint("ingestaServer.js", {
    NODE_ENV: "production",
    REFRESH_SECRET: "",
    PORT: "0",
  });
  assert.equal(timedOut, false, "debe abortar antes de escuchar, no seguir vivo");
  assert.equal(code, 1);
  assert.match(stderr, /REFRESH_SECRET/);
});

test("sesionServer.js rechaza arrancar en producción sin SESION_SECRET", async () => {
  const { code, stderr, timedOut } = await runEntrypoint("sesionServer.js", {
    NODE_ENV: "production",
    SESION_SECRET: "",
    PORT: "0",
  });
  assert.equal(timedOut, false, "debe abortar antes de escuchar, no seguir vivo");
  assert.equal(code, 1);
  assert.match(stderr, /SESION_SECRET/);
});

test("adminServer.js rechaza arrancar en producción sin ADMIN_SECRET", async () => {
  const { code, stderr, timedOut } = await runEntrypoint("adminServer.js", {
    NODE_ENV: "production",
    ADMIN_SECRET: "",
    PORT: "0",
  });
  assert.equal(timedOut, false, "debe abortar antes de escuchar, no seguir vivo");
  assert.equal(code, 1);
  assert.match(stderr, /ADMIN_SECRET/);
});

test("server.js SÍ arranca fuera de producción sin COOKIE_SECRET (comportamiento local sin cambios)", async () => {
  const { code, stderr, timedOut } = await runEntrypoint("server.js", {
    NODE_ENV: "development",
    COOKIE_SECRET: "",
    // Puerto 1 (privilegiado, nadie escucha ahí): la conexión se rechaza casi
    // al instante, así runMigrations() falla rápido y cae al warning normal
    // en vez de depender de si hay o no un Postgres real en localhost:5432.
    DATABASE_URL: "postgres://127.0.0.1:1/no_existe",
    PORT: "0",
  });
  assert.equal(timedOut, true, "fuera de producción debe seguir vivo, no abortar");
  assert.equal(code, null);
  assert.doesNotMatch(stderr, /abortando arranque/);
});

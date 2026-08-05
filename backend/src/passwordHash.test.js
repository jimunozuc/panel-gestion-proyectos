import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "./passwordHash.js";

test("verifyPassword acepta la contraseña correcta", async () => {
  const stored = await hashPassword("correcta123");
  assert.equal(await verifyPassword("correcta123", stored), true);
});

test("verifyPassword rechaza una contraseña incorrecta", async () => {
  const stored = await hashPassword("correcta123");
  assert.equal(await verifyPassword("incorrecta", stored), false);
});

test("dos hashes de la misma contraseña son distintos (salt aleatorio)", async () => {
  const a = await hashPassword("misma-clave");
  const b = await hashPassword("misma-clave");
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("misma-clave", a), true);
  assert.equal(await verifyPassword("misma-clave", b), true);
});

test("verifyPassword devuelve false ante un hash vacío/nulo (cuenta sin contraseña asignada)", async () => {
  assert.equal(await verifyPassword("cualquiera", null), false);
  assert.equal(await verifyPassword("cualquiera", ""), false);
});

test("verifyPassword no revienta con un valor guardado con formato inesperado", async () => {
  assert.equal(await verifyPassword("cualquiera", "sin-separador"), false);
});

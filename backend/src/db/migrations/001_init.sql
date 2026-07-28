CREATE TYPE user_role AS ENUM ('administrador', 'editor', 'lector');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  rol user_role NOT NULL DEFAULT 'editor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Árbol de hitos/tareas aplanado (3 niveles) para un sheet_id (ej. "P6.1.1").
-- Reemplaza, campo a campo, lo que antes se leía en vivo del Excel: la
-- primera lectura de una hoja la copia completa aquí; de ahí en adelante
-- esta tabla manda para esa hoja y el refresh de Excel deja de tocarla.
CREATE TABLE nodos (
  id SERIAL PRIMARY KEY,
  sheet_id TEXT NOT NULL,
  parent_id INTEGER REFERENCES nodos(id) ON DELETE CASCADE,
  nivel INTEGER NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Tarea',
  responsable TEXT NOT NULL DEFAULT '',
  inicio DATE,
  fin DATE,
  avance INTEGER NOT NULL DEFAULT 0,
  origen TEXT NOT NULL DEFAULT 'excel',
  editado_manualmente BOOLEAN NOT NULL DEFAULT false,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nodos_sheet ON nodos(sheet_id);
CREATE INDEX idx_nodos_parent ON nodos(parent_id);

CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  user_nombre TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  sheet_id TEXT,
  campo TEXT,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  accion TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

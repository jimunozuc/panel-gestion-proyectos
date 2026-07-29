-- Marca qué hojas ya se importaron una vez desde el Excel, independiente de
-- si hoy tienen filas en `nodos` o no. Sin esto, borrar todos los nodos de
-- una hoja hasta dejarla en cero hacía que el próximo GET la reimportara
-- sola desde el Excel (importSheetIfEmpty solo miraba "¿tiene filas hoy?").
CREATE TABLE IF NOT EXISTS imported_sheets (
  sheet_id TEXT PRIMARY KEY,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill: toda hoja que ya tiene nodos hoy se considera ya importada, para
-- no reimportarla (y duplicar su árbol) la primera vez que corra este código.
INSERT INTO imported_sheets (sheet_id)
SELECT DISTINCT sheet_id FROM nodos
ON CONFLICT (sheet_id) DO NOTHING;

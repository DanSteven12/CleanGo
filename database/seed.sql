-- ============================================================
-- CleanGo — Seed data (examples / development)
-- ============================================================

USE cleango;

-- ------------------------------------------------------------
-- Seed: rutas
-- ------------------------------------------------------------
INSERT IGNORE INTO rutas (id, nombre, descripcion, zona, color) VALUES
  (1, 'Ruta Norte', 'Recorrido de limpieza zona norte', 'Norte', '#4CAF50'),
  (2, 'Ruta Sur',   'Recorrido de limpieza zona sur',   'Sur',   '#2196F3');

-- ------------------------------------------------------------
-- Seed: puntos_control
-- ------------------------------------------------------------
INSERT IGNORE INTO puntos_control (id, ruta_id, nombre, latitud, longitud, orden) VALUES
  (1, 1, 'Inicio Norte',  19.4326, -99.1332, 1),
  (2, 1, 'Punto Medio',   19.4340, -99.1350, 2),
  (3, 1, 'Final Norte',   19.4360, -99.1370, 3),
  (4, 2, 'Inicio Sur',    19.4200, -99.1300, 1),
  (5, 2, 'Final Sur',     19.4180, -99.1280, 2);

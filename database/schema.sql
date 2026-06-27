-- ============================================================
-- CleanGo — Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS cleango
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cleango;

-- ------------------------------------------------------------
-- Table: rutas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rutas (
  id          INT          NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(255) NOT NULL,
  descripcion TEXT,
  zona        VARCHAR(255),
  color       VARCHAR(50),
  creado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: puntos_control
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS puntos_control (
  id       INT            NOT NULL AUTO_INCREMENT,
  ruta_id  INT            NOT NULL,
  nombre   VARCHAR(255),
  latitud  DECIMAL(10, 7) NOT NULL,
  longitud DECIMAL(10, 7) NOT NULL,
  orden    INT            NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT fk_puntos_ruta
    FOREIGN KEY (ruta_id) REFERENCES rutas (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

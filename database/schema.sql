-- ============================================================
-- CleanGo — Schema de referencia (tablas reales)
-- IMPORTANTE: No ejecutar si las tablas ya existen.
-- Las tablas fueron creadas previamente en la base de datos.
-- Este archivo es únicamente documentación de la estructura.
-- ============================================================

CREATE DATABASE IF NOT EXISTS cleango
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cleango;

asignaciones_rutas-- 1. TABLA DE RUTAS
-- Estructura simplificada: El campo 'nombre' guarda directo la zona (Ej: 'Ruta Centro')
CREATE TABLE rutas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL, 
    descripcion TEXT,
    color VARCHAR(7) DEFAULT '#3498db', -- Color para identificarla en el mapa
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA DE CHECKPOINTS / PUNTOS DE CONTROL
CREATE TABLE puntos_control (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ruta_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL, -- Ej. 'Esquina Parque Central'
    latitud DECIMAL(10, 8) NOT NULL,
    longitud DECIMAL(11, 8) NOT NULL,
    orden INT NOT NULL, -- 1, 2, 3... para el orden del recorrido
    es_obligatorio BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE CASCADE
);

-- 3. TABLA DE CAMIONES
CREATE TABLE camiones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_economico VARCHAR(50) NOT NULL UNIQUE,
    placa VARCHAR(20) NOT NULL UNIQUE,
    estado_unidad VARCHAR(30) DEFAULT 'Excelente',
    gps_instalado BOOLEAN DEFAULT TRUE,
    estatus_operativo VARCHAR(20) DEFAULT 'Disponible',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 4. TABLA DE CONDUCTORES
CREATE TABLE conductores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    num_licencia VARCHAR(50) NOT NULL UNIQUE,
    telefono VARCHAR(15),
    estado_empleado VARCHAR(20) DEFAULT 'Activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA DE ASIGNACIONES
-- Une la ruta con la unidad y el chofer asignado para el recorrido de un día específico
CREATE TABLE asignaciones_rutas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ruta_id INT NOT NULL,
    camion_id INT NOT NULL,
    conductor_id INT NOT NULL,
    fecha_programada DATE NOT NULL, -- Esencial para el módulo de Calendario
    estatus_recorrido VARCHAR(20) DEFAULT 'Pendiente', -- Pendiente, En Progreso, Completado
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE CASCADE,
    FOREIGN KEY (camion_id) REFERENCES camiones(id) ON DELETE RESTRICT,
    FOREIGN KEY (conductor_id) REFERENCES conductores(id) ON DELETE RESTRICT
);

CREATE TABLE asignaciones_rutas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ruta_id INT NOT NULL,
    camion_id INT NOT NULL,
    conductor_id INT NOT NULL,
    fecha_programada DATE NOT NULL,

    horario_inicio TIME NOT NULL,
    horario_fin TIME NOT NULL,

    estatus_recorrido VARCHAR(20) DEFAULT 'Pendiente',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE CASCADE,
    FOREIGN KEY (camion_id) REFERENCES camiones(id) ON DELETE RESTRICT,
    FOREIGN KEY (conductor_id) REFERENCES conductores(id) ON DELETE RESTRICT
);
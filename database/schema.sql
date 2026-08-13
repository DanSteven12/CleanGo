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

-- ============================================================
-- 1. TABLA DE RUTAS
-- El campo 'nombre' guarda directamente la zona o sector
-- (Ej. "Ruta Centro").
-- ============================================================
CREATE TABLE rutas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(7) DEFAULT '#3498db',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. TABLA DE HORARIOS BASE DE LAS RUTAS
-- Define el horario habitual de operación de cada ruta según
-- el día de la semana.
-- ============================================================
CREATE TABLE horarios_rutas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ruta_id INT NOT NULL,

    dia_semana ENUM(
        'Lunes','Martes','Miércoles',
        'Jueves','Viernes','Sábado','Domingo'
    ) NOT NULL,

    hora_inicio_estimada TIME NOT NULL,
    hora_fin_estimada TIME NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (ruta_id)
        REFERENCES rutas(id)
        ON DELETE CASCADE
);

-- ============================================================
-- 3. TABLA DE CHECKPOINTS / PUNTOS DE CONTROL
-- Define los puntos que conforman cada ruta.
-- ============================================================
CREATE TABLE puntos_control (
    id INT AUTO_INCREMENT PRIMARY KEY,

    ruta_id INT NOT NULL,

    nombre VARCHAR(100) NOT NULL,
    latitud DECIMAL(10,8) NOT NULL,
    longitud DECIMAL(11,8) NOT NULL,

    orden INT NOT NULL,

    es_obligatorio BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (ruta_id)
        REFERENCES rutas(id)
        ON DELETE CASCADE
);

-- ============================================================
-- 4. TABLA DE CAMIONES
-- Registra las unidades de recolección y las credenciales del
-- dispositivo móvil instalado en cada camión.
-- ============================================================
CREATE TABLE camiones (
    id INT AUTO_INCREMENT PRIMARY KEY,

    numero_economico VARCHAR(50) NOT NULL UNIQUE,
    placa VARCHAR(20) NOT NULL UNIQUE,

    gps_instalado BOOLEAN DEFAULT TRUE,

    usuario_dispositivo VARCHAR(50) NOT NULL UNIQUE,
    password_dispositivo VARCHAR(255) NOT NULL,

    -- Estado del dispositivo: controla si puede autenticarse en la app móvil.
    -- Administrado desde el sistema Web. Solo 'Activo' puede iniciar sesión.
    estado ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. TABLA DE CONDUCTORES
-- Almacena únicamente los conductores fijos registrados.
-- ============================================================
CREATE TABLE conductores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 6. TABLA DE USUARIOS
-- Almacena las cuentas de acceso del sistema web
-- (Administradores) y de la aplicación móvil (Ciudadanos).
-- ============================================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(150) NOT NULL,

    correo VARCHAR(150) NOT NULL UNIQUE,

    password VARCHAR(255) NOT NULL,

    rol ENUM(
        'Administrador',
        'Ciudadano'
    ) NOT NULL,

    estado ENUM(
        'Activo',
        'Bloqueado'
    ) DEFAULT 'Activo',

    ultimo_acceso DATETIME NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 7. TABLA DE ASIGNACIONES
-- Relaciona una ruta, un camión y un conductor para una fecha
-- y horario determinados.
-- ============================================================
CREATE TABLE asignaciones_rutas (
    id INT AUTO_INCREMENT PRIMARY KEY,

    ruta_id INT NOT NULL,
    camion_id INT NOT NULL,
    conductor_id INT NOT NULL,

    fecha_programada DATE NOT NULL,

    horario_inicio TIME NOT NULL,
    horario_fin TIME NOT NULL,

    estatus_recorrido VARCHAR(20)
        DEFAULT 'Pendiente',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (ruta_id)
        REFERENCES rutas(id)
        ON DELETE CASCADE,

    FOREIGN KEY (camion_id)
        REFERENCES camiones(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (conductor_id)
        REFERENCES conductores(id)
        ON DELETE RESTRICT
);

-- ============================================================
-- 8. TABLA DE RECORRIDOS
-- Registra la ejecución real de cada recorrido.
-- ============================================================
CREATE TABLE recorridos (
    id INT AUTO_INCREMENT PRIMARY KEY,

    asignacion_id INT NOT NULL,

    hora_inicio DATETIME NOT NULL,
    hora_fin DATETIME NULL,

    latitud_actual DECIMAL(10,8) NULL,
    longitud_actual DECIMAL(11,8) NULL,

    conductor_real_nombre VARCHAR(150) NULL,

    estado ENUM(
        'En progreso',
        'Completado',
        'Cancelado'
    ) DEFAULT 'En progreso',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (asignacion_id)
        REFERENCES asignaciones_rutas(id)
);

-- ============================================================
-- 9. TABLA DE RECORRIDO_CHECKPOINTS
-- Registra el cumplimiento de cada checkpoint durante el
-- recorrido.
-- ============================================================
CREATE TABLE recorrido_checkpoints (
    id INT AUTO_INCREMENT PRIMARY KEY,

    recorrido_id INT NOT NULL,
    checkpoint_id INT NOT NULL,

    hora_estimada DATETIME NULL,
    hora_llegada DATETIME NULL,

    estado ENUM(
        'Pendiente',
        'Completado',
        'Omitido'
    ) DEFAULT 'Pendiente',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (recorrido_id)
        REFERENCES recorridos(id)
        ON DELETE CASCADE,

    FOREIGN KEY (checkpoint_id)
        REFERENCES puntos_control(id)
        ON DELETE CASCADE
);

-- ============================================================
-- 10. TABLA DE REPORTES CIUDADANOS
-- Almacena los reportes enviados desde la aplicación móvil.
-- ============================================================
CREATE TABLE reportes_ciudadanos (
    id INT AUTO_INCREMENT PRIMARY KEY,

    usuario_id INT NOT NULL,

    tipo_reporte ENUM(
        'Basura acumulada',
        'Camión no pasó',
        'Contenedor lleno',
        'Calles contaminadas'
    ) NOT NULL,

    descripcion TEXT,

    fotografia VARCHAR(255),

    latitud DECIMAL(10,8) NOT NULL,
    longitud DECIMAL(11,8) NOT NULL,

    direccion_referencia VARCHAR(255),

    estado ENUM(
        'Pendiente',
        'En proceso',
        'Cerrado'
    ) DEFAULT 'Pendiente',

    fecha_reporte TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reporte_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- ============================================================
-- 11. TABLA DE NOTIFICACIONES
-- Almacena las notificaciones enviadas a ciudadanos y
-- conductores, ya sean automáticas del sistema o manuales
-- generadas por el administrador.
-- ============================================================
CREATE TABLE notificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,

    usuario_id INT NULL,
    conductor_id INT NULL,
    recorrido_id INT NULL,

    titulo VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,

    tipo ENUM(
        'AUTOMATICA',
        'MANUAL'
    ) NOT NULL,

    categoria ENUM(
        'REPORTE',
        'RECORRIDO',
        'RUTA',
        'AVISO'
    ) NOT NULL,

    destinatario ENUM(
        'CIUDADANOS',
        'CONDUCTORES',
        'AMBOS'
    ) NOT NULL,

    leida BOOLEAN DEFAULT FALSE,

    fecha_lectura DATETIME NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    FOREIGN KEY (conductor_id)
        REFERENCES conductores(id)
        ON DELETE CASCADE,

    FOREIGN KEY (recorrido_id)
        REFERENCES recorridos(id)
        ON DELETE CASCADE
);

-- ============================================================
-- 12. TABLA DE SESIONES
-- Mantiene el registro del identificador de token (jti) activo
-- para el control de sesiones concurrentes (1 por usuario).
-- ============================================================
CREATE TABLE sesiones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE,
    jti VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255) NULL,
    ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ============================================================
-- 13. TABLA DE SESIONES DE CAMIONES (DISPOSITIVOS MÓVILES)
-- Gestiona las sesiones activas de los dispositivos instalados
-- en cada camión. Separada de 'sesiones' para no modificar la
-- integridad referencial de las sesiones de usuarios del sistema.
-- Implementa: JWT, Refresh Token, rotación y revocación.
-- ============================================================
CREATE TABLE sesiones_camiones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    camion_id     INT NOT NULL UNIQUE,          -- 1 sesión activa por camión
    jti           VARCHAR(255) NOT NULL,        -- UUID del Access Token activo
    refresh_token_hash VARCHAR(255) NULL,       -- SHA-256 del Refresh Token
    ip            VARCHAR(45),
    user_agent    TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (camion_id) REFERENCES camiones(id) ON DELETE CASCADE
);
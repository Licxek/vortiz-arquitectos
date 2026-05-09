CREATE TYPE tipo_solicitud AS ENUM ('duda', 'servicio');
CREATE TYPE estado_cita AS ENUM ('pendiente', 'confirmada', 'cancelada');

CREATE TABLE citas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    tipo_solicitud tipo_solicitud NOT NULL,
    servicio_id INTEGER REFERENCES servicios(id) ON DELETE SET NULL,
    motivo TEXT NOT NULL,
    fecha_cita DATE NOT NULL,
    hora_cita TIME NOT NULL,
    estado estado_cita DEFAULT 'pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
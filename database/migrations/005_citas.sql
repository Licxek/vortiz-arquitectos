CREATE TABLE IF NOT EXISTS citas (
    id            SERIAL PRIMARY KEY,
    nombre        VARCHAR(200) NOT NULL,
    correo        VARCHAR(200) NOT NULL,
    telefono      VARCHAR(30) NOT NULL,
    tipo          VARCHAR(20) NOT NULL,
    servicio_id   INT,
    motivo        TEXT NOT NULL DEFAULT '',
    fecha         DATE NOT NULL,
    hora          VARCHAR(5) NOT NULL,
    duracion      INT NOT NULL DEFAULT 60,
    estado        VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cita_servicio
        FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE SET NULL
);
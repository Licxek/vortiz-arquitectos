CREATE TABLE servicios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(100),
    visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE servicios_imagenes (
    id SERIAL PRIMARY KEY,
    servicio_id INTEGER REFERENCES servicios(id) ON DELETE CASCADE,
    url_imagen VARCHAR(255) NOT NULL,
    orden INTEGER DEFAULT 0
);
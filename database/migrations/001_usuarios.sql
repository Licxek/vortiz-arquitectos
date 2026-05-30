CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(20) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO usuarios (nombre, apellidos, correo, password, rol)
VALUES (
        'César', 'Garcés González', 'cesar@vortizarquitectos.com',
        '$2b$10$yigCMdaoDhEAASrS7UD6putzhndzxIkR/PVy/A85Be5ZC9c6AaOVG',
        'admin'
)
ON CONFLICT (correo) DO NOTHING;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reset_token_expira TIMESTAMP;
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono VARCHAR(30);
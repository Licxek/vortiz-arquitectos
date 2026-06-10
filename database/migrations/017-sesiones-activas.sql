CREATE TABLE IF NOT EXISTS sesiones (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  user_agent TEXT,
  ip VARCHAR(50),
  navegador VARCHAR(100),
  sistema_operativo VARCHAR(100),
  dispositivo VARCHAR(100),
  ubicacion VARCHAR(200),
  ultimo_acceso TIMESTAMP DEFAULT NOW(),
  creada_en TIMESTAMP DEFAULT NOW(),
  activa BOOLEAN DEFAULT TRUE,
  cerrada_en TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones(usuario_id, activa);
CREATE INDEX IF NOT EXISTS idx_sesiones_token ON sesiones(token_hash);
CREATE TABLE IF NOT EXISTS codigos_verificacion (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  codigo VARCHAR(6) NOT NULL,
  proposito VARCHAR(50) NOT NULL,
  payload TEXT,
  expira_en TIMESTAMP NOT NULL,
  usado BOOLEAN DEFAULT FALSE,
  intentos INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_codigos_usuario_proposito
  ON codigos_verificacion(usuario_id, proposito, usado);
CREATE TABLE contenido_paginas (
    pagina      VARCHAR(50) PRIMARY KEY,
    contenido   JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
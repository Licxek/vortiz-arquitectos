-- 013_paginas_fijas_personalizacion.sql
-- Permite personalizar color e ícono de las páginas fijas

ALTER TABLE paginas_fijas_config 
  ADD COLUMN IF NOT EXISTS color VARCHAR(20),
  ADD COLUMN IF NOT EXISTS icono VARCHAR(50);

COMMENT ON COLUMN paginas_fijas_config.color IS 'Color preset (blue, teal, slate, etc) o hex (#0a4d7a) — NULL usa el default hardcoded';
COMMENT ON COLUMN paginas_fijas_config.icono IS 'Nombre del ícono (lock, info, home, etc) — NULL usa el default hardcoded';
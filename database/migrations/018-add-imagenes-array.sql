-- Agregar columna imagenes como array JSONB
ALTER TABLE proyectos 
ADD COLUMN IF NOT EXISTS imagenes JSONB DEFAULT '[]'::jsonb;

-- Migrar imágenes existentes al array (la imagen actual pasa al primer slot)
UPDATE proyectos 
SET imagenes = jsonb_build_array(imagen)
WHERE imagen IS NOT NULL 
  AND imagen != '' 
  AND (imagenes IS NULL OR imagenes = '[]'::jsonb);
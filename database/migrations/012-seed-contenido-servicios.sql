INSERT INTO contenido_paginas (pagina, contenido) VALUES (
  'servicios',
  '{
    "hero": {
      "badge": "Servicios",
      "titulo": "Lo que hacemos por *tu proyecto*",
      "descripcion": "Soluciones arquitectónicas integrales con metodología BIM y PMI.",
      "imagenFondo": "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1920"
    },
    "intro": {
      "badge": "Catálogo completo",
      "titulo": "Tu proyecto en manos expertas, de principio a fin",
      "descripcion": ""
    },
    "cta": {
      "titulo": "¿No estás seguro de cuál servicio *necesitas?*",
      "descripcion": "Cuéntanos sobre tu proyecto y nuestro equipo te orientará en una conversación inicial sin compromiso."
    }
  }'::jsonb
)
ON CONFLICT (pagina) DO UPDATE SET
  contenido = EXCLUDED.contenido,
  updated_at = CURRENT_TIMESTAMP;
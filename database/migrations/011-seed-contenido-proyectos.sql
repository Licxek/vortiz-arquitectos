INSERT INTO contenido_paginas (pagina, contenido) VALUES (
  'proyectos',
  '{
    "hero": {
      "badge": "Portafolio",
      "titulo": "Clientes que confiaron en *nuestro trabajo*",
      "descripcion": "Cada marca representa una historia de colaboración, planeación y ejecución.",
      "imagenFondo": "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1920"
    },
    "intro": {
      "badge": "Nuestro portafolio",
      "titulo": "150+ proyectos completados para empresas líderes en México",
      "descripcion": "Desde plantas industriales hasta infraestructura nacional, hemos colaborado con corporativos, gobiernos y desarrolladoras a lo largo de 20 años de trayectoria."
    },
    "cta": {
      "titulo": "¿Tu marca podría ser la *siguiente?*",
      "descripcion": "Conversemos sobre tu proyecto. Te explicamos cómo podemos sumarnos a tu visión."
    }
  }'::jsonb
)
ON CONFLICT (pagina) DO UPDATE SET
  contenido = EXCLUDED.contenido,
  updated_at = CURRENT_TIMESTAMP;
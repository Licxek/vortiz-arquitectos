-- Seed inicial del contenido del HOME (inicio)
-- Estructura: pagina -> seccion -> { campos string } | { lista: [...] }

INSERT INTO contenido_paginas (pagina, contenido) VALUES (
  'inicio',
  '{
    "hero": {
      "badge": "Arquitectura · Construcción · Diseño",
      "titulo": "Diseñamos *espacios*, construimos *confianza*",
      "descripcion": "Más de 20 años transformando ideas en proyectos arquitectónicos que perduran en el tiempo, en Durango y todo México.",
      "imagenFondo": "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1920",
      "cta1": "Ver nuestros proyectos",
      "cta2": "Agendar consulta"
    },
    "filosofia": {
      "badge": "Sobre Vortiz Arquitectos",
      "titulo": "Confianza y experiencia desde ~2005~",
      "parrafo1": "Somos una firma de arquitectura con sede en Durango que combina diseño contemporáneo, tecnología BIM y metodología PMI para entregar proyectos residenciales, comerciales e industriales que superan las expectativas.",
      "parrafo2": "Cada proyecto que tomamos lo tratamos como único: escuchamos, planeamos a detalle, ejecutamos con precisión y acompañamos hasta mucho después de la entrega.",
      "imagen": "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800"
    },
    "stats": {
      "lista": [
        { "valor": "20+", "label": "Años de experiencia" },
        { "valor": "150+", "label": "Proyectos completados" },
        { "valor": "120+", "label": "Clientes satisfechos" },
        { "valor": "12", "label": "Especialistas en el equipo" }
      ]
    },
    "servicios": {
      "badge": "Servicios",
      "titulo": "Soluciones arquitectónicas a tu medida",
      "descripcion": "Desde el primer trazo hasta la entrega de llaves, te acompañamos con un equipo multidisciplinario.",
      "visibles": ""
    },
    "proyectos": {
      "badge": "Portafolio",
      "titulo": "Marcas que confiaron en *nuestro trabajo*",
      "visibles": ""
    },
    "proceso": {
      "badge": "Proceso",
      "titulo": "Así trabajamos contigo",
      "lista": [
        { "numero": "01", "titulo": "Conversación inicial", "descripcion": "Escuchamos tu visión, necesidades y presupuesto para entender el proyecto." },
        { "numero": "02", "titulo": "Diseño y planeación", "descripcion": "Desarrollamos planos, renders 3D y cronograma detallado." },
        { "numero": "03", "titulo": "Ejecución supervisada", "descripcion": "Construimos con metodología BIM y supervisión técnica constante." },
        { "numero": "04", "titulo": "Entrega y acompañamiento", "descripcion": "Te entregamos el proyecto terminado con soporte post-construcción." }
      ]
    },
    "cta": {
      "badge": "Empieza tu proyecto",
      "titulo": "¿Listo para construir tu próximo *gran proyecto?*",
      "descripcion": "Agenda una conversación inicial sin compromiso. Te escuchamos, evaluamos tu idea y te decimos cómo podemos ayudarte a hacerla realidad.",
      "cta1": "Agenda tu consulta inicial",
      "cta2": "Escríbenos por WhatsApp",
      "imagenFondo": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920"
    }
  }'::jsonb
)
ON CONFLICT (pagina) DO UPDATE SET
  contenido = EXCLUDED.contenido,
  updated_at = CURRENT_TIMESTAMP;
-- Seed COMPLETO del contenido de NOSOTROS

INSERT INTO contenido_paginas (pagina, contenido) VALUES (
  'nosotros',
  '{
    "hero": {
      "badge": "Conoce nuestra firma",
      "titulo": "Diseñamos con *propósito*, construimos con *historia*",
      "descripcion": "Una firma de arquitectura nacida en Durango con visión nacional.",
      "imagenFondo": "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1920"
    },
    "intro": {
      "badge": "Quiénes Somos",
      "titulo": "Más que arquitectos, somos creadores de espacios con identidad",
      "descripcion": "Desde 2005, Vortiz Arquitectos ha sido sinónimo de diseño contemporáneo, eficiencia técnica y compromiso humano. Cada proyecto que tomamos es una oportunidad para transformar una idea en un lugar que perdure, que funcione, y que las personas que lo habitan disfruten cada día."
    },
    "mision": {
      "titulo": "Acompañamos cada proyecto con confianza y compromiso",
      "descripcion": "Brindar soluciones arquitectónicas integrales que combinen creatividad, tecnología y precisión técnica, transformando los espacios de nuestros clientes en obras de calidad que perduren en el tiempo."
    },
    "vision": {
      "titulo": "Ser referencia en arquitectura del norte de México",
      "descripcion": "Consolidarnos como una firma reconocida por la excelencia, la innovación y la construcción de relaciones sólidas con nuestros clientes, fortaleciendo nuestro liderazgo en cada proyecto."
    },
    "arquitecto": {
      "nombre": "Arq. Carlos Vortiz",
      "titulo": "Fundador y Director General",
      "foto": "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600",
      "biografia": "Con más de 20 años transformando ideas en realidades arquitectónicas, el Arq. Carlos Vortiz fundó la firma en 2005 con la visión de elevar el estándar de la arquitectura en Durango. Egresado con honores y certificado en metodología BIM y PMI, ha liderado más de 150 proyectos residenciales, comerciales e industriales.",
      "biografia2": "Su filosofía combina diseño contemporáneo, eficiencia técnica y un profundo respeto por las necesidades del cliente. Cree firmemente que la buena arquitectura no es solo estética: es la capacidad de mejorar la vida de las personas que habitan los espacios.",
      "email": "carlos@vortizarquitectos.com",
      "linkedin": "https://linkedin.com/in/..."
    },
    "credenciales": {
      "lista": [
        { "titulo": "Arquitecto Titulado", "institucion": "Universidad Juárez del Estado de Durango", "anio": "2003" },
        { "titulo": "Maestría en Gestión de Proyectos", "institucion": "Tec de Monterrey", "anio": "2008" },
        { "titulo": "Certificación BIM", "institucion": "Autodesk", "anio": "2010" },
        { "titulo": "Project Management Professional (PMP)", "institucion": "Project Management Institute", "anio": "2012" }
      ]
    },
    "hitos": {
      "lista": [
        { "anio": "2005", "titulo": "Fundación de Vortiz Arquitectos", "descripcion": "Inicio de la firma en Durango con un equipo de 3 personas." },
        { "anio": "2010", "titulo": "Certificación BIM y PMI", "descripcion": "Implementación de metodologías internacionales de gestión." },
        { "anio": "2015", "titulo": "Expansión regional", "descripcion": "Primeros proyectos fuera de Durango: Mazatlán, Monterrey y Guadalajara." },
        { "anio": "2020", "titulo": "100+ proyectos entregados", "descripcion": "Alcanzamos el centenar de obras completadas con éxito." },
        { "anio": "2025", "titulo": "20 años de trayectoria", "descripcion": "Consolidación como referencia en arquitectura del norte de México." }
      ]
    },
    "valores": {
      "badge": "Lo que nos define",
      "titulo": "Nuestros valores",
      "descripcion": "Seis principios que rigen cada decisión, cada plano y cada obra que entregamos.",
      "lista": [
        { "icono": "shield-check", "titulo": "Calidad constructiva", "descripcion": "Materiales premium y supervisión técnica en cada etapa." },
        { "icono": "hard-hat", "titulo": "Seguridad industrial", "descripcion": "Protocolos estrictos para proteger a trabajadores y clientes." },
        { "icono": "leaf", "titulo": "Responsabilidad ambiental", "descripcion": "Diseños sostenibles que respetan el entorno." },
        { "icono": "document-check", "titulo": "Cumplimiento normativo", "descripcion": "Apego a todas las normativas y permisos vigentes." },
        { "icono": "handshake", "titulo": "Profesionalismo y ética", "descripcion": "Transparencia total en costos, tiempos y procesos." },
        { "icono": "lightning", "titulo": "Eficiencia en diseño", "descripcion": "Metodología BIM y PMI para entregas puntuales." }
      ]
    },
    "cta": {
      "titulo": "¿Te gustaría trabajar con nosotros?",
      "descripcion": "Agenda una reunión inicial y descubre cómo podemos hacer realidad tu proyecto."
    }
  }'::jsonb
)
ON CONFLICT (pagina) DO UPDATE SET
  contenido = EXCLUDED.contenido,
  updated_at = CURRENT_TIMESTAMP;
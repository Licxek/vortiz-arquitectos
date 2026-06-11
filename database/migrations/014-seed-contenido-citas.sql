INSERT INTO contenido_paginas (pagina, contenido) VALUES (
  'citas',
  '{
    "hero": {
      "badge": "Agenda tu cita",
      "titulo": "Conversemos sobre *tu proyecto*",
      "descripcion": "Llena el formulario y nos pondremos en contacto contigo en menos de 24 horas."
    },
    "beneficios": {
      "titulo": "¿Por qué agendar con nosotros?",
      "beneficio1": "Respuesta en menos de 24h",
      "beneficio2": "Consulta inicial sin compromiso",
      "beneficio3": "Asesoría de un profesional certificado",
      "beneficio4": "Cotización rápida y transparente"
    },
    "horarios": {
      "lunVie": "9:00 – 18:00",
      "sabado": "9:00 – 13:00",
      "domingo": "Cerrado"
    }
  }'::jsonb
)
ON CONFLICT (pagina) DO UPDATE SET
  contenido = EXCLUDED.contenido,
  updated_at = CURRENT_TIMESTAMP;
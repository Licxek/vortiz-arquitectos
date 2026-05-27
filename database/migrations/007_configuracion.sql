DROP TABLE IF EXISTS configuracion;

CREATE TABLE configuracion (
  id SERIAL PRIMARY KEY,
  negocio JSONB NOT NULL DEFAULT '{}',
  contacto JSONB NOT NULL DEFAULT '{}',
  redes JSONB NOT NULL DEFAULT '[]',
  agenda JSONB NOT NULL DEFAULT '{}',
  apariencia JSONB NOT NULL DEFAULT '{}',
  notificaciones JSONB NOT NULL DEFAULT '{}',
  seo JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO configuracion (negocio, contacto, redes, agenda, apariencia, notificaciones, seo) VALUES (
  '{"nombre":"Vortiz Arquitectos","eslogan":"Diseñamos espacios, construimos confianza.","direccion":"Milpillas 101, La Forestal","ciudad":"Durango","estado":"Dgo.","codigoPostal":"34217","rfc":"VOR000000-001"}',
  '{"telefono":"+52 618 000 0000","whatsapp":"618 000 0000","correoPublico":"contacto@vortizarquitectos.com","correoNotificaciones":"alertas@vortizarquitectos.com"}',
  '[{"nombre":"Instagram","icono":"instagram","url":"https://www.instagram.com/vortizarquitectos","activa":true,"color":"pink"},{"nombre":"Facebook","icono":"facebook","url":"https://www.facebook.com/vortizarquitectos","activa":true,"color":"blue"},{"nombre":"LinkedIn","icono":"linkedin","url":"https://www.linkedin.com/in/vortizarquitectos","activa":true,"color":"sky"},{"nombre":"Twitter / X","icono":"twitter","url":"","activa":false,"color":"gray"},{"nombre":"YouTube","icono":"youtube","url":"","activa":false,"color":"red"}]',
  '{"diasSemana":[{"nombre":"Lunes","abrev":"Lun","activo":true},{"nombre":"Martes","abrev":"Mar","activo":true},{"nombre":"Miércoles","abrev":"Mié","activo":true},{"nombre":"Jueves","abrev":"Jue","activo":true},{"nombre":"Viernes","abrev":"Vie","activo":true},{"nombre":"Sábado","abrev":"Sáb","activo":false},{"nombre":"Domingo","abrev":"Dom","activo":false}],"horaInicio":"09:00","horaFin":"18:00","duracionCita":60,"tiempoEntreCitas":15,"limiteDiario":8,"diasFeriados":[{"id":1,"fecha":"2026-12-25","motivo":"Navidad"},{"id":2,"fecha":"2026-01-01","motivo":"Año nuevo"}]}',
  '{"logoUrl":"/assets/img/logo.png","logoFooterUrl":"/assets/img/logo_vortiz.png","faviconUrl":"/assets/img/logo.ico","colorPrimario":"#0a4d7a","colorSecundario":"#0a1f3d","degradadoInicio":"#000000","degradadoFin":"#0a1f3d"}',
  '{"nuevaCita":true,"nuevaConsulta":true,"resumenDiario":false,"resumenSemanal":true,"recordatorio24h":true,"recordatorio1h":false,"canalRecordatorio":"email"}',
  '{"metaTitle":"Vortiz Arquitectos - Diseño y construcción profesional en Durango","metaDescription":"Firma de arquitectura en Durango especializada en proyectos residenciales, comerciales e industriales.","keywords":"arquitectos durango, diseño residencial, proyectos comerciales, construcción","ogImageUrl":"/assets/img/og-image.png"}'
);

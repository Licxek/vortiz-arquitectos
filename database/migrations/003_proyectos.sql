CREATE TABLE proyectos (
    id           SERIAL PRIMARY KEY,
    nombre       VARCHAR(150) NOT NULL,
    iniciales    VARCHAR(10) NOT NULL DEFAULT '',
    logo_url     VARCHAR(255) NOT NULL DEFAULT '',
    categoria    VARCHAR(50) NOT NULL DEFAULT 'corporativo',
    ubicacion    VARCHAR(150) NOT NULL DEFAULT '',
    anio         INTEGER NOT NULL DEFAULT 0,
    color_marca  VARCHAR(20) NOT NULL DEFAULT '#0a4d7a',
    descripcion  TEXT NOT NULL DEFAULT '',
    orden        INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE proyectos
  ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'en_diseno',
  ADD COLUMN IF NOT EXISTS publicado BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cliente VARCHAR(150) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS superficie VARCHAR(50) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS progreso INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_inicio DATE,
  ADD COLUMN IF NOT EXISTS fecha_entrega DATE,
  ADD COLUMN IF NOT EXISTS imagen VARCHAR(255) NOT NULL DEFAULT '';

INSERT INTO proyectos (nombre, iniciales, logo_url, categoria, ubicacion, anio, color_marca, descripcion, orden) VALUES
('Toyota','TY','/assets/img/icons/logoToyota.ico','corporativo','Guanajuato',2018,'#EB0A1E','Planta automotriz y áreas corporativas.',1),
('Bancomer','BX','/assets/img/icons/logoBBVA.ico','corporativo','Durango',2015,'#004481','Remodelación de sucursales bancarias.',2),
('Aeropuerto de Cancún','AC','/assets/img/icons/logoAirport.ico','infraestructura','Quintana Roo',2019,'#00A859','Ampliación de terminal de pasajeros.',3),
('Puente Baluarte','PB','/assets/img/icons/logoPuente.ico','infraestructura','Durango–Sinaloa',2012,'#6B7280','Obra hidráulica complementaria.',4),
('COFICAB','CF','/assets/img/icons/logoCoficab.svg','industrial','Aguascalientes',2020,'#0066B3','Nave industrial y oficinas.',5),
('CA Automotive','CA','/assets/img/icons/logoCA.ico','industrial','Durango',2021,'#1F2937','Planta y centro de distribución.',6),
('Casas Geo','CG','/assets/img/icons/logoCasas.ico','residencial','Varios estados',2017,'#7DC242','Fraccionamientos residenciales.',7),
('Paseo Durango','PD','/assets/img/icons/logoPaseo.ico','comercial','Durango',2016,'#F59E0B','Plaza comercial y entretenimiento.',8),
('Ecocab','EC','/assets/img/icons/logoEcocab.ico','industrial','Durango',2019,'#10B981','Planta de manufactura eléctrica.',9),
('Fanosa','FN','/assets/img/icons/logoFanosa.ico','industrial','Durango',2022,'#DC2626','Almacenes y áreas operativas.',10),
('Centro Penitenciario','CP','/assets/img/icons/logoPrision.ico','institucional','Durango',2014,'#374151','Infraestructura institucional.',11);

UPDATE proyectos
SET estado = 'finalizado', publicado = TRUE, progreso = 100
WHERE estado = 'en_diseno';
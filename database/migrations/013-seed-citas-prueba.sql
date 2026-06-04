-- ============================================================================
-- Migración 015: Citas de prueba para Dashboard
-- ============================================================================
-- Inserta 50 citas distribuidas en los últimos 60 días con variedad de
-- estados, tipos y servicios para visualizar el dashboard con datos reales.
--
-- TENDENCIA: crece progresivamente de ~3 citas/semana hace 8 semanas
-- a ~7 citas/semana en la última semana (perfecto para ver crecimiento).
--
-- Para BORRAR estos datos después (cuando vayas a producción):
--   DELETE FROM citas WHERE correo LIKE '%@example.com';
-- ============================================================================

INSERT INTO citas (nombre, correo, telefono, tipo, servicio_id, motivo, fecha, hora, duracion, estado, created_at, updated_at)
VALUES
-- ===== HACE 8 SEMANAS (3 citas) =====
('María González Pérez', 'maria.gonzalez@example.com', '6181234567', 'consulta', 1, 'Asesoría sobre permisos de construcción para bodega industrial', CURRENT_DATE - INTERVAL '56 days', '10:00', 60, 'completada', NOW() - INTERVAL '58 days', NOW() - INTERVAL '56 days'),
('Juan Carlos Pérez Romero', 'jc.perez@example.com', '6189876543', 'proyecto', 2, 'Diseño de casa habitación 250m² en Las Misiones', CURRENT_DATE - INTERVAL '54 days', '11:30', 90, 'completada', NOW() - INTERVAL '56 days', NOW() - INTERVAL '54 days'),
('Roberto Sánchez Núñez', 'roberto.sn@example.com', '6182345678', 'consulta', 3, 'Trámite de licencia de uso de suelo', CURRENT_DATE - INTERVAL '52 days', '15:00', 60, 'cancelada', NOW() - INTERVAL '54 days', NOW() - INTERVAL '52 days'),

-- ===== HACE 7 SEMANAS (4 citas) =====
('Laura Martínez Romero', 'laura.mr@example.com', '6183456789', 'proyecto', 4, 'Remodelación integral de cocina y comedor', CURRENT_DATE - INTERVAL '49 days', '09:30', 120, 'completada', NOW() - INTERVAL '51 days', NOW() - INTERVAL '49 days'),
('Patricia Ramírez Soto', 'patricia.rs@example.com', '6184567890', 'consulta', 5, 'Información sobre construcción de fraccionamiento', CURRENT_DATE - INTERVAL '47 days', '13:00', 60, 'completada', NOW() - INTERVAL '49 days', NOW() - INTERVAL '47 days'),
('Miguel Ángel López', 'miguel.al@example.com', '6185678901', 'proyecto', 6, 'Diseño y construcción de oficinas para PyME', CURRENT_DATE - INTERVAL '46 days', '11:00', 90, 'completada', NOW() - INTERVAL '48 days', NOW() - INTERVAL '46 days'),
('Ana Karen Flores', 'akaren.flores@example.com', '6186789012', 'consulta', 7, 'Asesoría para remodelación de local comercial', CURRENT_DATE - INTERVAL '44 days', '16:00', 60, 'cancelada', NOW() - INTERVAL '46 days', NOW() - INTERVAL '44 days'),

-- ===== HACE 6 SEMANAS (4 citas) =====
('Fernando Castro Vázquez', 'fcastro@example.com', '6187890123', 'proyecto', 8, 'Construcción de bodega industrial 800m²', CURRENT_DATE - INTERVAL '42 days', '10:30', 120, 'completada', NOW() - INTERVAL '44 days', NOW() - INTERVAL '42 days'),
('Sofía Hernández Cruz', 'sofia.hc@example.com', '6188901234', 'consulta', 9, 'Cambio de uso de suelo para oficinas', CURRENT_DATE - INTERVAL '40 days', '14:00', 60, 'completada', NOW() - INTERVAL '42 days', NOW() - INTERVAL '40 days'),
('Diego Morales Treviño', 'diego.mt@example.com', '6189012345', 'consulta', 10, 'Consultoría sobre normativa de construcción', CURRENT_DATE - INTERVAL '38 days', '12:00', 60, 'confirmada', NOW() - INTERVAL '40 days', NOW() - INTERVAL '38 days'),
('Elena Torres Galindo', 'elena.tg@example.com', '6180123456', 'proyecto', 11, 'Diseño de residencia campestre', CURRENT_DATE - INTERVAL '36 days', '15:30', 90, 'completada', NOW() - INTERVAL '38 days', NOW() - INTERVAL '36 days'),

-- ===== HACE 5 SEMANAS (5 citas) =====
('Ricardo Mendoza Salas', 'ricardo.ms@example.com', '6181122334', 'proyecto', 12, 'Edificio departamental de 4 niveles', CURRENT_DATE - INTERVAL '35 days', '09:00', 120, 'completada', NOW() - INTERVAL '37 days', NOW() - INTERVAL '35 days'),
('Valeria Cruz Herrera', 'valeria.ch@example.com', '6182233445', 'consulta', 13, 'Información sobre supervisión de obra', CURRENT_DATE - INTERVAL '33 days', '11:00', 60, 'completada', NOW() - INTERVAL '35 days', NOW() - INTERVAL '33 days'),
('Alejandro Vargas Ruiz', 'alex.vr@example.com', '6183344556', 'proyecto', 14, 'Diseño de hotel boutique 20 habitaciones', CURRENT_DATE - INTERVAL '31 days', '10:00', 120, 'completada', NOW() - INTERVAL '33 days', NOW() - INTERVAL '31 days'),
('Gabriela Reyes Olvera', 'gabriela.ro@example.com', '6184455667', 'consulta', 1, 'Trámite de constancia de uso de suelo', CURRENT_DATE - INTERVAL '30 days', '13:30', 60, 'cancelada', NOW() - INTERVAL '32 days', NOW() - INTERVAL '30 days'),
('Eduardo Rojas Castañeda', 'eduardo.rc@example.com', '6185566778', 'consulta', 2, 'Avalúo para venta de propiedad residencial', CURRENT_DATE - INTERVAL '29 days', '16:30', 60, 'completada', NOW() - INTERVAL '31 days', NOW() - INTERVAL '29 days'),

-- ===== HACE 4 SEMANAS (5 citas) =====
('Mariana Silva Padilla', 'mariana.sp@example.com', '6186677889', 'proyecto', 3, 'Construcción de casa unifamiliar', CURRENT_DATE - INTERVAL '27 days', '10:30', 90, 'completada', NOW() - INTERVAL '29 days', NOW() - INTERVAL '27 days'),
('Pablo Aguirre Mendívil', 'pablo.am@example.com', '6187788990', 'consulta', 4, 'Asesoría legal para regularización de predio', CURRENT_DATE - INTERVAL '25 days', '11:30', 60, 'completada', NOW() - INTERVAL '27 days', NOW() - INTERVAL '25 days'),
('Daniela Ortiz Camargo', 'dortiz@example.com', '6188899001', 'proyecto', 5, 'Remodelación de fachada comercial', CURRENT_DATE - INTERVAL '23 days', '14:30', 90, 'completada', NOW() - INTERVAL '25 days', NOW() - INTERVAL '23 days'),
('Sergio Jiménez Barrios', 'sergio.jb@example.com', '6189900112', 'consulta', 6, 'Información sobre planos arquitectónicos', CURRENT_DATE - INTERVAL '22 days', '09:30', 60, 'cancelada', NOW() - INTERVAL '24 days', NOW() - INTERVAL '22 days'),
('Beatriz Salazar Quintero', 'beatriz.sq@example.com', '6180011223', 'consulta', 7, 'Cálculo estructural para ampliación', CURRENT_DATE - INTERVAL '21 days', '15:00', 60, 'completada', NOW() - INTERVAL '23 days', NOW() - INTERVAL '21 days'),

-- ===== HACE 3 SEMANAS (6 citas) =====
('Andrés Castillo Vega', 'andres.cv@example.com', '6181100112', 'proyecto', 8, 'Diseño de casa habitación con alberca', CURRENT_DATE - INTERVAL '20 days', '10:00', 90, 'completada', NOW() - INTERVAL '22 days', NOW() - INTERVAL '20 days'),
('Lucía Vega Montalvo', 'lucia.vm@example.com', '6182211223', 'consulta', 9, 'Consultoría sobre permiso de demolición', CURRENT_DATE - INTERVAL '19 days', '12:30', 60, 'completada', NOW() - INTERVAL '21 days', NOW() - INTERVAL '19 days'),
('Hugo Navarro Espinoza', 'hugo.ne@example.com', '6183322334', 'proyecto', 10, 'Diseño de centro recreativo familiar', CURRENT_DATE - INTERVAL '17 days', '11:00', 120, 'completada', NOW() - INTERVAL '19 days', NOW() - INTERVAL '17 days'),
('Camila Estrada Lugo', 'camila.el@example.com', '6184433445', 'consulta', 11, 'Información sobre certificación LEED', CURRENT_DATE - INTERVAL '16 days', '14:00', 60, 'confirmada', NOW() - INTERVAL '18 days', NOW() - INTERVAL '16 days'),
('Iván Domínguez Robles', 'ivan.dr@example.com', '6185544556', 'proyecto', 12, 'Remodelación de restaurante en Plaza San Pedro', CURRENT_DATE - INTERVAL '15 days', '09:00', 120, 'completada', NOW() - INTERVAL '17 days', NOW() - INTERVAL '15 days'),
('Cristina Acosta Rosales', 'cristina.ar@example.com', '6186655667', 'consulta', 13, 'Asesoría para construcción ecológica', CURRENT_DATE - INTERVAL '15 days', '16:00', 60, 'cancelada', NOW() - INTERVAL '17 days', NOW() - INTERVAL '15 days'),

-- ===== HACE 2 SEMANAS (6 citas) =====
('Rodrigo Núñez Verdugo', 'rodrigo.nv@example.com', '6187766778', 'proyecto', 14, 'Edificio de oficinas en Av. 20 de Noviembre', CURRENT_DATE - INTERVAL '13 days', '10:30', 120, 'completada', NOW() - INTERVAL '15 days', NOW() - INTERVAL '13 days'),
('Mónica Velázquez Trejo', 'monica.vt@example.com', '6188877889', 'consulta', 1, 'Cambio de uso de suelo de habitacional a comercial', CURRENT_DATE - INTERVAL '12 days', '11:30', 60, 'completada', NOW() - INTERVAL '14 days', NOW() - INTERVAL '12 days'),
('Adrián Bautista Méndez', 'adrian.bm@example.com', '6189988990', 'proyecto', 2, 'Construcción de casa con vista panorámica', CURRENT_DATE - INTERVAL '11 days', '15:30', 90, 'confirmada', NOW() - INTERVAL '13 days', NOW() - INTERVAL '11 days'),
('Karla Ruiz Maldonado', 'karla.rm@example.com', '6180099001', 'consulta', 3, 'Trámite ante INFONAVIT para crédito hipotecario', CURRENT_DATE - INTERVAL '10 days', '13:00', 60, 'completada', NOW() - INTERVAL '12 days', NOW() - INTERVAL '10 days'),
('José Luis Cano Pizarro', 'jl.cano@example.com', '6181100223', 'proyecto', 4, 'Diseño de bodega refrigerada para alimentos', CURRENT_DATE - INTERVAL '9 days', '10:00', 120, 'cancelada', NOW() - INTERVAL '11 days', NOW() - INTERVAL '9 days'),
('Renata Carrillo Sosa', 'renata.cs@example.com', '6182211334', 'consulta', 5, 'Asesoría para regularización de construcción', CURRENT_DATE - INTERVAL '8 days', '14:30', 60, 'pendiente', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),

-- ===== HACE 1 SEMANA (7 citas) =====
('Ernesto Bravo Galván', 'ernesto.bg@example.com', '6183322445', 'proyecto', 6, 'Construcción de salón de eventos 500 personas', CURRENT_DATE - INTERVAL '7 days', '09:30', 120, 'completada', NOW() - INTERVAL '9 days', NOW() - INTERVAL '7 days'),
('Paola Esquivel Tovar', 'paola.et@example.com', '6184433556', 'consulta', 7, 'Información sobre normativa para hospitales', CURRENT_DATE - INTERVAL '6 days', '11:00', 60, 'completada', NOW() - INTERVAL '8 days', NOW() - INTERVAL '6 days'),
('Octavio Plata Solís', 'octavio.ps@example.com', '6185544667', 'proyecto', 8, 'Centro comercial pequeño 6 locales', CURRENT_DATE - INTERVAL '5 days', '10:00', 120, 'confirmada', NOW() - INTERVAL '7 days', NOW() - INTERVAL '5 days'),
('Verónica Cabrera Olivas', 'veronica.co@example.com', '6186655778', 'consulta', 9, 'Avalúo de propiedad heredada para venta', CURRENT_DATE - INTERVAL '4 days', '15:00', 60, 'completada', NOW() - INTERVAL '6 days', NOW() - INTERVAL '4 days'),
('Marcos Tapia Cordero', 'marcos.tc@example.com', '6187766889', 'proyecto', 10, 'Diseño y construcción de cabaña en La Joya', CURRENT_DATE - INTERVAL '3 days', '11:30', 90, 'confirmada', NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days'),
('Adriana Lazcano Gómez', 'adriana.lg@example.com', '6188877990', 'consulta', 11, 'Trámite de permiso de construcción residencial', CURRENT_DATE - INTERVAL '2 days', '13:30', 60, 'completada', NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days'),
('Bruno Saldaña Cobos', 'bruno.sc@example.com', '6189988001', 'consulta', 12, 'Consulta sobre presupuesto para diseño', CURRENT_DATE - INTERVAL '1 day', '16:00', 60, 'cancelada', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),

-- ===== ESTA SEMANA (5 citas incluyendo hoy y próximos días) =====
('Ximena Beltrán Aragón', 'ximena.ba@example.com', '6180099112', 'consulta', 13, 'Asesoría para construcción de palapa techo de palma', CURRENT_DATE, '10:00', 60, 'pendiente', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
('Tomás Herrera Lara', 'tomas.hl@example.com', '6181100334', 'proyecto', 14, 'Remodelación integral de hacienda histórica', CURRENT_DATE, '15:00', 120, 'confirmada', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),
('Natalia Saucedo Pacheco', 'natalia.sp@example.com', '6182211445', 'consulta', 1, 'Información sobre presupuesto para diseño residencial', CURRENT_DATE + INTERVAL '1 day', '11:00', 60, 'pendiente', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
('Esteban Quintana Yáñez', 'esteban.qy@example.com', '6183322556', 'proyecto', 2, 'Diseño de gimnasio crossfit con baños', CURRENT_DATE + INTERVAL '2 days', '14:00', 90, 'confirmada', NOW() - INTERVAL '2 days', NOW()),
('Lorena Barragán Espino', 'lorena.be@example.com', '6184433667', 'consulta', 3, 'Trámite de subdivisión de terreno', CURRENT_DATE + INTERVAL '3 days', '09:30', 60, 'pendiente', NOW(), NOW()),

-- ===== PRÓXIMAS 2 SEMANAS (5 citas futuras) =====
('Joaquín Toledo Fierro', 'joaquin.tf@example.com', '6185544778', 'proyecto', 4, 'Casa habitación de 3 niveles con elevador', CURRENT_DATE + INTERVAL '5 days', '10:30', 120, 'confirmada', NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),
('Tania Murillo Ibarra', 'tania.mi@example.com', '6186655889', 'consulta', 5, 'Información sobre arquitectura sustentable', CURRENT_DATE + INTERVAL '7 days', '13:00', 60, 'pendiente', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
('Maximiliano Cuevas Tena', 'max.cuevas@example.com', '6187766990', 'proyecto', 6, 'Edificio de departamentos para renta', CURRENT_DATE + INTERVAL '10 days', '11:00', 120, 'confirmada', NOW() - INTERVAL '3 days', NOW()),
('Regina Páez Hidalgo', 'regina.ph@example.com', '6188878001', 'consulta', 7, 'Consulta sobre normativa de protección civil', CURRENT_DATE + INTERVAL '14 days', '15:30', 60, 'pendiente', NOW(), NOW()),
('Felipe Aldana Cortés', 'felipe.ac@example.com', '6189988112', 'consulta', 8, 'Diseño preliminar para casa de campo', CURRENT_DATE + INTERVAL '18 days', '10:00', 60, 'pendiente', NOW(), NOW());

-- ============================================================================
-- Verificar: total de citas insertadas
-- ============================================================================
-- SELECT COUNT(*) AS citas_prueba FROM citas WHERE correo LIKE '%@example.com';
-- 
-- Resultado esperado: 50
-- ============================================================================
CREATE TABLE configuracion (
    id SERIAL PRIMARY KEY,
    logo_url VARCHAR(255),
    logo_footer_url VARCHAR(255),
    telefono VARCHAR(20),
    correo_contacto VARCHAR(150),
    direccion TEXT,
    instagram VARCHAR(255),
    facebook VARCHAR(255),
    linkedin VARCHAR(255),
    whatsapp VARCHAR(20),
    horario VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO configuracion (
    logo_url,
    logo_footer_url,
    telefono,
    correo_contacto,
    direccion,
    instagram,
    facebook,
    linkedin,
    whatsapp,
    horario
) VALUES (
    '/assets/img/logo.png',
    '/assets/img/logo_vortiz.png',
    '+52 000-000-0000',
    'contacto@vortizarquitectos.com',
    'Milpillas 101, La Forestal, 34217 Durango, Dgo.',
    'https://www.instagram.com/',
    'https://www.facebook.com/',
    'https://www.linkedin.com/',
    '000-000-0000',
    'Lunes - Viernes 9:00 - 18:00'
);
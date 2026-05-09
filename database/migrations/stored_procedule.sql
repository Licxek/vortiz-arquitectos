-- Citas por mes para dashboard
CREATE OR REPLACE FUNCTION obtener_citas_por_mes()
RETURNS TABLE (mes TEXT, total BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        TO_CHAR(fecha_cita, 'YYYY-MM') as mes,
        COUNT(*) as total
    FROM citas
    GROUP BY mes
    ORDER BY mes;
END;
$$ LANGUAGE plpgsql;

-- Servicios mas solicitados
CREATE OR REPLACE FUNCTION obtener_servicios_solicitados()
RETURNS TABLE (servicio TEXT, total BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.nombre as servicio,
        COUNT(c.id) as total
    FROM citas c
    JOIN servicios s ON c.servicio_id = s.id
    GROUP BY s.nombre
    ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql;

-- Actividad de citas por estado
CREATE OR REPLACE FUNCTION obtener_actividad_citas()
RETURNS TABLE (estado TEXT, total BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        estado_cita::TEXT as estado,
        COUNT(*) as total
    FROM citas
    GROUP BY estado_cita;
END;
$$ LANGUAGE plpgsql;
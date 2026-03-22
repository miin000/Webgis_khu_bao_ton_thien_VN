-- neon_webgis_setup.sql
-- Run this file in Neon SQL Editor or via psql.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS public.protected_area_vn (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT,
    type TEXT,
    founded TEXT,
    area NUMERIC(14,2),
    address TEXT,
    management TEXT,
    layer TEXT,
    geom geometry(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_protected_area_vn_geom
ON public.protected_area_vn USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_protected_area_vn_type
ON public.protected_area_vn (type);

CREATE INDEX IF NOT EXISTS idx_protected_area_vn_address
ON public.protected_area_vn (address);

CREATE TABLE IF NOT EXISTS public.edit_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id BIGINT,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    user_name TEXT NOT NULL DEFAULT 'anonymous',
    client_ip TEXT,
    before_data JSONB,
    after_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edit_logs_created_at
ON public.edit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_edit_logs_entity
ON public.edit_logs (entity_type, entity_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protected_area_vn_updated_at ON public.protected_area_vn;
CREATE TRIGGER trg_protected_area_vn_updated_at
BEFORE UPDATE ON public.protected_area_vn
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Optional staging table if you import from JSON rows where geom is EWKB hex string.
CREATE TABLE IF NOT EXISTS public.protected_area_vn_staging (
    id BIGINT,
    name TEXT,
    region TEXT,
    type TEXT,
    founded TEXT,
    area NUMERIC(14,2),
    address TEXT,
    management TEXT,
    layer TEXT,
    geom TEXT
);

-- Example UPSERT from staging to final table.
-- INSERT INTO public.protected_area_vn
--     (id, name, region, type, founded, area, address, management, layer, geom)
-- SELECT
--     s.id,
--     s.name,
--     s.region,
--     s.type,
--     s.founded,
--     s.area,
--     s.address,
--     s.management,
--     s.layer,
--     ST_SetSRID(ST_GeomFromEWKB(decode(s.geom, 'hex')), 4326)
-- FROM public.protected_area_vn_staging s
-- ON CONFLICT (id) DO UPDATE
-- SET name = EXCLUDED.name,
--     region = EXCLUDED.region,
--     type = EXCLUDED.type,
--     founded = EXCLUDED.founded,
--     area = EXCLUDED.area,
--     address = EXCLUDED.address,
--     management = EXCLUDED.management,
--     layer = EXCLUDED.layer,
--     geom = EXCLUDED.geom,
--     updated_at = now();

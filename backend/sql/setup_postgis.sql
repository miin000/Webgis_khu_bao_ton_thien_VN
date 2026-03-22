CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS public.protected_areas (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT,
    type TEXT,
    founded TEXT,
    area NUMERIC,
    address TEXT,
    management TEXT,
    layer TEXT,
    geom geometry(Point, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_protected_areas_geom
ON public.protected_areas USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_protected_areas_type
ON public.protected_areas (type);

CREATE INDEX IF NOT EXISTS idx_protected_areas_address
ON public.protected_areas (address);

-- Optional import pattern when the source table contains EWKB hex in a text column named geom.
-- INSERT INTO public.protected_areas (id, name, region, type, founded, area, address, management, layer, geom)
-- SELECT id, name, region, type, founded, area, address, management, layer,
--        ST_SetSRID(ST_GeomFromEWKB(decode(geom, 'hex')), 4326)
-- FROM public.protected_area_vn_raw;

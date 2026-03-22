require('dotenv').config();
const { Client } = require('pg');

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false,
  });

  await client.connect();

  const sql = `
    ALTER TABLE public.protected_area_vn
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

    ALTER TABLE public.protected_area_vn
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS trigger
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
  `;

  await client.query(sql);
  await client.end();

  console.log('UPDATED_AT_FIX_OK');
}

run().catch((error) => {
  console.error('UPDATED_AT_FIX_FAIL', error.message);
  process.exit(1);
});

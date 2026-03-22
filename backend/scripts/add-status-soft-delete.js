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
    ADD COLUMN IF NOT EXISTS status text;

    UPDATE public.protected_area_vn
    SET status = 'active'
    WHERE status IS NULL OR status = '';

    ALTER TABLE public.protected_area_vn
    ALTER COLUMN status SET DEFAULT 'active';

    CREATE INDEX IF NOT EXISTS idx_protected_area_vn_status
    ON public.protected_area_vn (status);
  `;

  await client.query(sql);
  await client.end();
  console.log('STATUS_COLUMN_FIX_OK');
}

run().catch((error) => {
  console.error('STATUS_COLUMN_FIX_FAIL', error.message);
  process.exit(1);
});

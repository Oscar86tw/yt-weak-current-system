import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: process.env.DB_URL?.includes('render.com') || process.env.DB_URL?.includes('supabase') ? { rejectUnauthorized: false } : false
});

export default pool;

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    await pool.query(`ALTER TYPE location_category ADD VALUE IF NOT EXISTS 'gates'`);
    await pool.query(`ALTER TYPE location_category ADD VALUE IF NOT EXISTS 'parking'`);
    console.log('Added gates and parking to location_category');
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
})();

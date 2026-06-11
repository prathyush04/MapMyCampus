require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    const fs = require('fs');
    const sql = fs.readFileSync(require('path').resolve(__dirname, './db/migrations/012_add_feature_suggestions.sql'), 'utf8');
    await pool.query(sql);
    console.log('Ran migration 012_add_feature_suggestions.sql');
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
})();

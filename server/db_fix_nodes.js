require('dotenv').config({ path: '../.env' });
const pool = require('./db/pool');

async function fixNodes() {
  const { rows: edges254 } = await pool.query('SELECT * FROM graph_edges WHERE from_node = 254 OR to_node = 254');
  console.log("Edges for 254:", edges254);

  pool.end();
}
fixNodes();

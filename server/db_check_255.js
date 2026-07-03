require('dotenv').config({ path: '../.env' });
const pool = require('./db/pool');

async function check255() {
  const { rows: edges255 } = await pool.query(
    'SELECT * FROM graph_edges WHERE from_node = 255 OR to_node = 255'
  );
  console.log("Edges connected to 255 (all):", edges255);

  const { rows: edges53 } = await pool.query(
    'SELECT * FROM graph_edges WHERE from_node = 53 OR to_node = 53'
  );
  console.log("Edges connected to 53 (all):", edges53);

  pool.end();
}
check255();

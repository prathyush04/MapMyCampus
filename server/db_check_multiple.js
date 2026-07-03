require('dotenv').config({ path: '../.env' });
const pool = require('./db/pool');

async function checkNodes() {
  const { rows: nodes7 } = await pool.query('SELECT * FROM graph_nodes WHERE location_id = 7');
  console.log("Nodes for Location 7 (L Block):", nodes7);
  
  const { rows: nodes9 } = await pool.query('SELECT * FROM graph_nodes WHERE location_id = 9');
  console.log("Nodes for Location 9 (New Building):", nodes9);
  pool.end();
}
checkNodes();

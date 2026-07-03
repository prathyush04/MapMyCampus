require('dotenv').config({ path: '../.env' });
const pool = require('./db/pool');

async function checkCoords() {
  const { rows: nodes } = await pool.query(
    'SELECT * FROM graph_nodes WHERE id IN (53, 123, 124, 255, 254, 121, 117)'
  );
  console.log("Nodes Coordinates:", nodes);
  pool.end();
}
checkCoords();

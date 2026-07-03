require('dotenv').config();
const pool = require('./db/pool');
async function test() {
  const { rows } = await pool.query('SELECT from_node, to_node, weight FROM graph_edges LIMIT 2');
  console.log(rows);
  if (rows.length > 0) {
    console.log("Type of from_node:", typeof rows[0].from_node);
    console.log("Value:", rows[0].from_node);
  }
  pool.end();
}
test();

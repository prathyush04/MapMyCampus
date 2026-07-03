require('dotenv').config({ path: '../.env' });
const pool = require('./db/pool');

async function testPath() {
  const { rows: edges } = await pool.query('SELECT * FROM graph_edges WHERE is_approved=true');
  
  const edgesFrom124 = edges.filter(e => e.from_node === 124 || e.to_node === 124);
  console.log("Edges connected to 124:", edgesFrom124);

  const edgesFrom115 = edges.filter(e => e.from_node === 115 || e.to_node === 115);
  console.log("Edges connected to 115:", edgesFrom115);

  const edgesFrom118 = edges.filter(e => e.from_node === 118 || e.to_node === 118);
  console.log("Edges connected to 118:", edgesFrom118);

  const edgesFrom121 = edges.filter(e => e.from_node === 121 || e.to_node === 121);
  console.log("Edges connected to 121:", edgesFrom121);
  pool.end();
}
testPath();

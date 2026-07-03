require('dotenv').config({ path: '../.env' });
const pool = require('./db/pool');

async function testPath() {
  const { rows: nodes } = await pool.query('SELECT * FROM graph_nodes');
  const { rows: edges } = await pool.query('SELECT * FROM graph_edges WHERE is_approved=true');
  
  
  const lBlock = nodes.find(n => n.id === 51);
  const newB = nodes.find(n => n.id === 53);
  
  console.log("L Block:", lBlock);
  console.log("New Building:", newB);
  
  
  const edgesFrom117 = edges.filter(e => e.from_node === 117 || e.to_node === 117);
  console.log("Edges connected to 117:", edgesFrom117);
  
  const edgesFrom123 = edges.filter(e => e.from_node === 123 || e.to_node === 123);
  console.log("Edges connected to 123:", edgesFrom123);

  pool.end();
}
testPath();

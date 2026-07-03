require('dotenv').config({ path: '../.env' });
const pool = require('./db/pool');
const { dijkstra } = require('./utils/dijkstra');

async function testPath() {
  try {
    const { rows } = await pool.query('SELECT from_node, to_node, weight FROM graph_edges WHERE is_approved=true');
    const adj = new Map();
    for (const { from_node, to_node, weight } of rows) {
      const w = parseFloat(weight);
      if (!adj.has(from_node)) adj.set(from_node, []);
      if (!adj.has(to_node))   adj.set(to_node, []);
      adj.get(from_node).push({ to: to_node, weight: w });
      adj.get(to_node).push({ to: from_node, weight: w });
    }

    const result = dijkstra(adj, 51, 53);
    console.log("Current shortest path from 51 to 53:", result);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
testPath();

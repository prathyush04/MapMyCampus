require('dotenv').config({ path: '../.env' });
const pool = require('./db/pool');

async function investigate() {
  try {
    console.log("Searching for locations...");
    const { rows: locations } = await pool.query(
      `SELECT id, name FROM locations WHERE name ILIKE '%L Block%' OR name ILIKE '%Viksit%' OR name ILIKE '%New Building%'`
    );
    console.log("Found Locations:", locations);

    if (locations.length === 0) {
      console.log("No locations found.");
      return;
    }

    const locIds = locations.map(l => l.id);
    const { rows: nodes } = await pool.query(
      `SELECT id, location_id, x, y FROM graph_nodes WHERE location_id = ANY($1)`,
      [locIds]
    );
    console.log("Associated Nodes:", nodes);

    if (nodes.length > 0) {
      const nodeIds = nodes.map(n => n.id);
      console.log(`Checking edges for nodes: ${nodeIds.join(', ')}`);
      const { rows: edges } = await pool.query(
        `SELECT id, from_node, to_node, weight, is_approved 
         FROM graph_edges 
         WHERE from_node = ANY($1) OR to_node = ANY($1)`,
        [nodeIds]
      );
      console.log("Connected Edges:", edges);
    }
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    pool.end();
  }
}

investigate();

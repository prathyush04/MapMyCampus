const pool  = require('../db/pool');
const { cache, keys } = require('../utils/cache');
const { dijkstra } = require('../utils/dijkstra');

async function buildAdjacencyList() {
  const { rows } = await pool.query(
    'SELECT from_node, to_node, weight FROM graph_edges WHERE is_approved=true'
  );
  const adj = new Map();
  for (const { from_node, to_node, weight } of rows) {
    if (!adj.has(from_node)) adj.set(from_node, []);
    if (!adj.has(to_node))   adj.set(to_node, []);
    adj.get(from_node).push({ to: to_node, weight });
    adj.get(to_node).push({ to: from_node, weight }); // undirected
  }
  return adj;
}

exports.getGraph = async (req, res) => {
  const [nodesResult, edgesResult] = await Promise.all([
    pool.query('SELECT * FROM graph_nodes'),
    pool.query('SELECT * FROM graph_edges WHERE is_approved=true'),
  ]);
  res.json({ nodes: nodesResult.rows, edges: edgesResult.rows });
};

exports.getRoute = async (req, res) => {
  const from = parseInt(req.query.from);
  const to   = parseInt(req.query.to);
  if (!from || !to) return res.status(400).json({ error: 'from and to node IDs required' });

  const cacheKey = keys.routeCache(from, to);
  const cached   = await cache.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));

  const adj    = await buildAdjacencyList();
  const result = dijkstra(adj, from, to);
  if (!result) return res.status(404).json({ error: 'No path found' });

  // Enrich path with coordinates
  const { rows: nodes } = await pool.query(
    'SELECT id,x,y,location_id FROM graph_nodes WHERE id = ANY($1)',
    [result.path]
  );
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const enriched = { ...result, coordinates: result.path.map((id) => nodeMap[id]) };

  await cache.set(cacheKey, JSON.stringify(enriched), 'EX', 86400);
  res.json(enriched);
};

exports.addEdge = async (req, res) => {
  const { from_node, to_node, weight, is_approved = false } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO graph_edges(from_node,to_node,weight,is_approved) VALUES($1,$2,$3,$4) RETURNING *',
    [from_node, to_node, weight, is_approved]
  );
  res.status(201).json(rows[0]);
};

exports.deleteEdge = async (req, res) => {
  await pool.query('DELETE FROM graph_edges WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
};

exports.addNode = async (req, res) => {
  const { x, y, location_id } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO graph_nodes(x,y,location_id) VALUES($1,$2,$3) RETURNING *',
    [x, y, location_id || null]
  );
  res.status(201).json(rows[0]);
};

exports.updateNode = async (req, res) => {
  const { location_id } = req.body;
  const { rows } = await pool.query(
    'UPDATE graph_nodes SET location_id=$1 WHERE id=$2 RETURNING *',
    [location_id, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
};

exports.deleteNode = async (req, res) => {
  await pool.query('DELETE FROM graph_edges WHERE from_node=$1 OR to_node=$1', [req.params.id]);
  await pool.query('DELETE FROM graph_nodes WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
};

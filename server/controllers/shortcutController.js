const pool = require('../db/pool');
const { cache } = require('../utils/cache');

const SNAP_DISTANCE = 10; // metres — reuse node if within this distance

async function invalidateNodeRoutes(nodeId) {
  const stream = cache.scanStream({ match: 'route:*', count: 100 });
  const toDelete = [];
  for await (const batch of stream) {
    for (const k of batch) {
      const parts = k.split(':');
      if (parts[1] === String(nodeId) || parts[2] === String(nodeId)) toDelete.push(k);
    }
  }
  if (toDelete.length) await cache.del(toDelete);
}

/** Find an existing node within SNAP_DISTANCE metres, or insert a new one. */
async function getOrCreateNode(lng, lat) {
  // Pull all nodes and check distance in JS (graph is small)
  const { rows } = await pool.query('SELECT id, x, y FROM graph_nodes');
  for (const n of rows) {
    const dLat = (n.y - lat) * 110540;
    const dLng = (n.x - lng) * 111320 * Math.cos(lat * Math.PI / 180);
    if (Math.hypot(dLat, dLng) <= SNAP_DISTANCE) return n;
  }
  const { rows: ins } = await pool.query(
    'INSERT INTO graph_nodes(x,y) VALUES($1,$2) RETURNING *',
    [lng, lat]
  );
  return ins[0];
}

exports.mine = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM shortcut_requests WHERE requester_id=$1 ORDER BY created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
};

async function notifyAdmins(app, type, payload) {
  const { rows: admins } = await pool.query(`SELECT id FROM users WHERE role='admin'`);
  const emitToRoom = app.get('emitToRoom');
  for (const admin of admins) {
    await pool.query(
      `INSERT INTO notifications(user_id,type,payload) VALUES($1,$2,$3)`,
      [admin.id, type, JSON.stringify(payload)]
    );
    emitToRoom(`user:${admin.id}`, 'notification', {
      type, payload, is_read: false, created_at: new Date().toISOString(),
    });
  }
}

exports.create = async (req, res) => {
  const { from_lat, from_lng, to_lat, to_lng, description } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO shortcut_requests(requester_id,from_lat,from_lng,to_lat,to_lng,description)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.user.id, from_lat, from_lng, to_lat, to_lng, description]
  );
  await notifyAdmins(req.app, 'shortcut_submitted', {
    shortcut_id: rows[0].id,
    requester_name: req.user.name,
    description: rows[0].description,
  });
  res.status(201).json(rows[0]);
};

exports.list = async (req, res) => {
  const { status = 'pending' } = req.query;
  const { rows } = await pool.query(
    `SELECT s.*, u.name as requester_name FROM shortcut_requests s
     JOIN users u ON u.id=s.requester_id
     WHERE s.status=$1 ORDER BY s.created_at DESC`,
    [status]
  );
  res.json(rows);
};

exports.review = async (req, res) => {
  const { id } = req.params;
  const { status, from_lat, from_lng, to_lat, to_lng, description, rejection_note } = req.body;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const { rows } = await pool.query(
    `UPDATE shortcut_requests
     SET status=$1, reviewed_by=$2,
         from_lat=COALESCE($3,from_lat), from_lng=COALESCE($4,from_lng),
         to_lat=COALESCE($5,to_lat),     to_lng=COALESCE($6,to_lng),
         description=COALESCE($7,description),
         rejection_note=COALESCE($8,rejection_note)
     WHERE id=$9 RETURNING *`,
    [status, req.user.id, from_lat, from_lng, to_lat, to_lng, description, rejection_note || null, id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const s = rows[0];

  const emitToRoom = req.app.get('emitToRoom');

  if (status === 'approved') {
    const fromNode = await getOrCreateNode(s.from_lng, s.from_lat);
    const toNode   = await getOrCreateNode(s.to_lng,   s.to_lat);

    const weight = Math.hypot(
      (fromNode.x - toNode.x) * 111320 * Math.cos(fromNode.y * Math.PI / 180),
      (fromNode.y - toNode.y) * 110540
    );

    await pool.query(
      'INSERT INTO graph_edges(from_node,to_node,weight,is_approved) VALUES($1,$2,$3,true)',
      [fromNode.id, toNode.id, weight]
    );

    await invalidateNodeRoutes(fromNode.id);
    await invalidateNodeRoutes(toNode.id);
    emitToRoom('broadcast', 'graph_updated', {});
  }

  res.json(s);
};

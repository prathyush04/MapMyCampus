const pool = require('../db/pool');

const SNAP_DISTANCE = 10;

async function getOrCreateNode(lng, lat, locationId) {
  const { rows } = await pool.query('SELECT id, x, y FROM graph_nodes');
  for (const n of rows) {
    const dLat = (n.y - lat) * 110540;
    const dLng = (n.x - lng) * 111320 * Math.cos(lat * Math.PI / 180);
    if (Math.hypot(dLat, dLng) <= SNAP_DISTANCE) {
      // Update existing node with location_id if not set
      if (!n.location_id && locationId) {
        await pool.query('UPDATE graph_nodes SET location_id=$1 WHERE id=$2', [locationId, n.id]);
      }
      return n;
    }
  }
  const { rows: ins } = await pool.query(
    'INSERT INTO graph_nodes(x,y,location_id) VALUES($1,$2,$3) RETURNING *',
    [lng, lat, locationId || null]
  );
  return ins[0];
}

exports.mine = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM location_requests WHERE requester_id=$1 ORDER BY created_at DESC`,
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
  const { name, description, category, lat, lng } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO location_requests(requester_id,name,description,category,lat,lng)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.user.id, name, description, category, lat, lng]
  );
  await notifyAdmins(req.app, 'location_submitted', {
    request_id: rows[0].id,
    requester_name: req.user.name,
    name: rows[0].name,
    category: rows[0].category,
  });
  res.status(201).json(rows[0]);
};

exports.list = async (req, res) => {
  const { status = 'pending' } = req.query;
  const { rows } = await pool.query(
    `SELECT lr.*, u.name as requester_name
     FROM location_requests lr
     JOIN users u ON u.id = lr.requester_id
     WHERE lr.status = $1 ORDER BY lr.created_at DESC`,
    [status]
  );
  res.json(rows);
};

exports.review = async (req, res) => {
  const { id } = req.params;
  const { status, name, slug, description, category, rejection_note } = req.body;

  if (status === 'approved' && !slug) {
    return res.status(400).json({ error: 'slug is required to approve' });
  }

  const { rows } = await pool.query(
    `UPDATE location_requests
     SET status=$1, reviewed_by=$2,
         name=COALESCE($3,name), slug=COALESCE($4,slug),
         description=COALESCE($5,description), category=COALESCE($6,category),
         rejection_note=COALESCE($7,rejection_note)
     WHERE id=$8 RETURNING *`,
    [status, req.user.id, name, slug, description, category, rejection_note || null, id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });

  const r = rows[0];

  if (status === 'approved') {
    const { rows: locRows } = await pool.query(
      `INSERT INTO locations(name,slug,description,category,lat,lng)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [r.name, r.slug, r.description, r.category, r.lat, r.lng]
    );
    await getOrCreateNode(r.lng, r.lat, locRows[0].id);
  }

  res.json(r);
};

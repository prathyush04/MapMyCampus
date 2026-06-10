const pool  = require('../db/pool');
const { cache, keys } = require('../utils/cache');

async function getAvgRating(locationId) {
  const cached = await cache.hget(keys.ratings(locationId), 'avg');
  if (cached) return parseFloat(cached);
  const { rows } = await pool.query('SELECT AVG(rating)::numeric(3,2) as avg FROM reviews WHERE location_id=$1', [locationId]);
  const avg = parseFloat(rows[0].avg) || 0;
  await cache.hset(keys.ratings(locationId), 'avg', avg);
  return avg;
}

exports.list = async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM locations WHERE is_active=true ORDER BY name');
  const locations = await Promise.all(rows.map(async (l) => ({ ...l, avg_rating: await getAvgRating(l.id) })));
  res.json(locations);
};

exports.get = async (req, res) => {
  const { id } = req.params;
  const { page = 1 } = req.query;
  const limit = 10;
  const offset = (page - 1) * limit;

  const locResult = await pool.query('SELECT * FROM locations WHERE id=$1', [id]);
  if (!locResult.rows.length) return res.status(404).json({ error: 'Not found' });
  const location = locResult.rows[0];

  const [reviewsResult, postsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT r.*, u.name as user_name FROM reviews r
       JOIN users u ON u.id=r.user_id
       WHERE r.location_id=$1 ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    ),
    pool.query(
      `SELECT p.*, u.name as user_name FROM location_posts p
       JOIN users u ON u.id=p.user_id
       WHERE p.location_id=$1 AND (p.expires_at IS NULL OR p.expires_at > NOW())
       ORDER BY p.created_at DESC LIMIT 20`,
      [id]
    ),
    pool.query('SELECT COUNT(*) FROM reviews WHERE location_id=$1', [id]),
  ]);

  res.json({
    ...location,
    avg_rating: await getAvgRating(id),
    reviews: reviewsResult.rows,
    review_count: parseInt(countResult.rows[0].count),
    posts: postsResult.rows,
  });
};

const SNAP_DISTANCE = 10;

async function getOrCreateNode(lng, lat, locationId) {
  const { rows } = await pool.query('SELECT id, x, y, location_id FROM graph_nodes');
  for (const n of rows) {
    const dLat = (n.y - lat) * 110540;
    const dLng = (n.x - lng) * 111320 * Math.cos(lat * Math.PI / 180);
    if (Math.hypot(dLat, dLng) <= SNAP_DISTANCE) {
      if (!n.location_id && locationId) {
        await pool.query('UPDATE graph_nodes SET location_id=$1 WHERE id=$2', [locationId, n.id]);
      }
      return n;
    }
  }
  await pool.query('INSERT INTO graph_nodes(x,y,location_id) VALUES($1,$2,$3)', [lng, lat, locationId]);
}

exports.create = async (req, res) => {
  const { name, slug, description, category, lat, lng, operating_hours, node_id } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO locations(name,slug,description,category,lat,lng,operating_hours)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [name, slug, description, category, lat, lng, JSON.stringify(operating_hours || {})]
  );
  const location = rows[0];
  if (node_id) {
    await pool.query('UPDATE graph_nodes SET location_id=$1 WHERE id=$2', [location.id, node_id]);
  } else {
    await getOrCreateNode(lng, lat, location.id);
  }
  res.status(201).json(location);
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const fields = ['name','slug','description','category','lat','lng','operating_hours','is_active'];
  const updates = [];
  const values  = [];
  let i = 1;
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f}=$${i++}`);
      values.push(f === 'operating_hours' ? JSON.stringify(req.body[f]) : req.body[f]);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE locations SET ${updates.join(',')} WHERE id=$${i} RETURNING *`,
    values
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  // Unlink graph node but keep it (don't break the graph)
  await pool.query('UPDATE graph_nodes SET location_id=NULL WHERE location_id=$1', [id]);
  await pool.query('DELETE FROM locations WHERE id=$1', [id]);
  res.json({ ok: true });
};

exports.search = async (req, res) => {
  const { q = '', category, minRating } = req.query;
  const conditions = ['l.is_active=true'];
  const values = [];
  let i = 1;

  if (q) {
    conditions.push(`l.search_vector @@ plainto_tsquery('english', $${i++})`);
    values.push(q);
  }
  if (category) {
    conditions.push(`l.category=$${i++}`);
    values.push(category);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(`SELECT l.* FROM locations l ${where} ORDER BY l.name`, values);

  let results = await Promise.all(rows.map(async (l) => ({ ...l, avg_rating: await getAvgRating(l.id) })));
  if (minRating) results = results.filter((l) => l.avg_rating >= parseFloat(minRating));
  res.json(results);
};

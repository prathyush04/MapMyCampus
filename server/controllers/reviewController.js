const pool = require('../db/pool');
const { cache, keys } = require('../utils/cache');

async function refreshRatingCache(locationId) {
  const { rows } = await pool.query(
    'SELECT AVG(rating)::numeric(3,2) as avg, COUNT(*) as cnt FROM reviews WHERE location_id=$1',
    [locationId]
  );
  await cache.hset(keys.ratings(locationId), 'avg', rows[0].avg || 0, 'count', rows[0].cnt || 0);
}

exports.create = async (req, res) => {
  const { location_id, rating, body } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO reviews(user_id,location_id,rating,body) VALUES($1,$2,$3,$4)
     ON CONFLICT (user_id,location_id) DO UPDATE SET rating=$3,body=$4,created_at=NOW()
     RETURNING *`,
    [req.user.id, location_id, rating, body]
  );
  await refreshRatingCache(location_id);

  const io = req.app.get('io');
  io.to(`location:${location_id}`).emit('review_added', rows[0]);
  res.status(201).json(rows[0]);
};

exports.list = async (req, res) => {
  const { locationId } = req.params;
  const { page = 1 } = req.query;
  const limit  = 10;
  const offset = (page - 1) * limit;
  const { rows } = await pool.query(
    `SELECT r.*, u.name as user_name FROM reviews r
     JOIN users u ON u.id=r.user_id
     WHERE r.location_id=$1 ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`,
    [locationId, limit, offset]
  );
  const { rows: cnt } = await pool.query('SELECT COUNT(*) FROM reviews WHERE location_id=$1', [locationId]);
  res.json({ reviews: rows, total: parseInt(cnt[0].count) });
};

exports.vote = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const existing = await pool.query(
    'SELECT 1 FROM review_votes WHERE user_id=$1 AND review_id=$2',
    [userId, id]
  );

  if (existing.rows.length) {
    await pool.query('DELETE FROM review_votes WHERE user_id=$1 AND review_id=$2', [userId, id]);
    await pool.query('UPDATE reviews SET helpful_count=helpful_count-1 WHERE id=$1', [id]);
    return res.json({ voted: false });
  }

  await pool.query('INSERT INTO review_votes(user_id,review_id) VALUES($1,$2)', [userId, id]);
  const { rows } = await pool.query(
    'UPDATE reviews SET helpful_count=helpful_count+1 WHERE id=$1 RETURNING helpful_count',
    [id]
  );
  res.json({ voted: true, helpful_count: rows[0].helpful_count });
};

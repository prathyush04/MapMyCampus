const pool = require('../db/pool');

exports.create = async (req, res) => {
  const { location_id, body, post_type, expires_at } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO location_posts(user_id,location_id,body,post_type,expires_at)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [req.user.id, location_id, body, post_type || 'info', expires_at || new Date(Date.now() + 2 * 60 * 60 * 1000)]
  );

  const { rows: userRows } = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
  const post = { ...rows[0], user_name: userRows[0].name };

  const io = req.app.get('io');
  io.to(`location:${location_id}`).emit('new_post', post);
  res.status(201).json(post);
};

exports.list = async (req, res) => {
  const { locationId } = req.params;
  const { rows } = await pool.query(
    `SELECT p.*, u.name as user_name FROM location_posts p
     JOIN users u ON u.id=p.user_id
     WHERE p.location_id=$1 AND (p.expires_at IS NULL OR p.expires_at > NOW())
     ORDER BY p.created_at DESC`,
    [locationId]
  );
  res.json(rows);
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query('SELECT user_id FROM location_posts WHERE id=$1', [id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await pool.query('DELETE FROM location_posts WHERE id=$1', [id]);
  res.json({ message: 'Deleted' });
};

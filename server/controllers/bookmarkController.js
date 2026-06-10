const pool = require('../db/pool');

exports.toggle = async (req, res) => {
  const { locationId } = req.params;
  const userId = req.user.id;

  const existing = await pool.query(
    'SELECT 1 FROM bookmarks WHERE user_id=$1 AND location_id=$2',
    [userId, locationId]
  );

  if (existing.rows.length) {
    await pool.query('DELETE FROM bookmarks WHERE user_id=$1 AND location_id=$2', [userId, locationId]);
    return res.json({ bookmarked: false });
  }

  await pool.query('INSERT INTO bookmarks(user_id,location_id) VALUES($1,$2)', [userId, locationId]);
  res.json({ bookmarked: true });
};

exports.list = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT l.* FROM locations l
     JOIN bookmarks b ON b.location_id=l.id
     WHERE b.user_id=$1 ORDER BY l.name`,
    [req.user.id]
  );
  res.json(rows);
};

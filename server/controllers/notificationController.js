const pool = require('../db/pool');

exports.list = async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  res.json(rows);
};

exports.readAll = async (req, res) => {
  await pool.query('UPDATE notifications SET is_read=true WHERE user_id=$1', [req.user.id]);
  res.json({ ok: true });
};

const pool = require('../db/pool');

exports.create = async (req, res) => {
  const { body } = req.body;
  const userId = req.user ? req.user.id : null;
  if (!body) return res.status(400).json({ error: 'Body required' });
  const { rows } = await pool.query(
    'INSERT INTO feature_suggestions(user_id, body) VALUES($1, $2) RETURNING *',
    [userId, body]
  );
  res.status(201).json(rows[0]);
};

exports.list = async (req, res) => {
  const { status } = req.query; // pending, planned, implemented, rejected
  let query = `
    SELECT f.*, u.name as user_name 
    FROM feature_suggestions f 
    LEFT JOIN users u ON u.id = f.user_id 
  `;
  const values = [];
  if (status) {
    query += ' WHERE f.status = $1';
    values.push(status);
  }
  query += ' ORDER BY f.created_at DESC';
  const { rows } = await pool.query(query, values);
  res.json(rows);
};

exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const { rows } = await pool.query(
    'UPDATE feature_suggestions SET status=$1 WHERE id=$2 RETURNING *',
    [status, id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
};

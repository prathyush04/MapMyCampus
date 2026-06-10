const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const pool    = require('../db/pool');
const { cache, keys } = require('../utils/cache');
const mailer  = require('../utils/mailer');

exports.sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const domain = process.env.ALLOWED_EMAIL_DOMAIN;
  if (domain && !email.toLowerCase().endsWith(`@${domain}`)) {
    return res.status(400).json({ error: `Only @${domain} emails are allowed` });
  }

  const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
  if (existing.rows.length) return res.status(409).json({ error: 'Email already registered' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await cache.set(`otp:${email.toLowerCase()}`, otp, 'EX', 600);
  
  try {
    await mailer.sendOtp(email.toLowerCase(), otp);
    res.json({ message: 'OTP sent' });
  } catch (error) {
    console.error('Error sending OTP email:', error);
    res.status(500).json({ error: 'Failed to send OTP email' });
  }
};

const SALT_ROUNDS      = 12;
const ACCESS_EXPIRY    = '15m';
const REFRESH_EXPIRY   = '7d';
const REFRESH_EXPIRY_S = 7 * 24 * 3600;

function makeTokens(user) {
  const jti = crypto.randomUUID();
  const access = jwt.sign(
    { id: user.id, email: user.email, role: user.role, jti },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );
  const refresh = jwt.sign(
    { id: user.id, jti },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
  return { access, refresh, jti };
}

function setRefreshCookie(res, token) {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_EXPIRY_S * 1000,
  });
}

exports.register = async (req, res) => {
  const { email, password, name, otp } = req.body;
  if (!email || !password || !name || !otp) return res.status(400).json({ error: 'email, password, name, and otp required' });

  const domain = process.env.ALLOWED_EMAIL_DOMAIN;
  if (domain && !email.toLowerCase().endsWith(`@${domain}`)) {
    return res.status(400).json({ error: `Only @${domain} emails are allowed` });
  }

  const storedOtp = await cache.get(`otp:${email.toLowerCase()}`);
  if (!storedOtp || storedOtp !== otp) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
  if (existing.rows.length) return res.status(409).json({ error: 'Email already registered' });

  await cache.del(`otp:${email.toLowerCase()}`);

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await pool.query(
    'INSERT INTO users(email,password_hash,name) VALUES($1,$2,$3) RETURNING id,email,name,role',
    [email.toLowerCase(), hash, name]
  );
  const user = rows[0];
  const { access, refresh } = makeTokens(user);
  await cache.set(keys.refreshSession(user.id), refresh, 'EX', REFRESH_EXPIRY_S);
  setRefreshCookie(res, refresh);
  res.status(201).json({ token: access, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const { access, refresh } = makeTokens(user);
  await cache.set(keys.refreshSession(user.id), refresh, 'EX', REFRESH_EXPIRY_S);
  setRefreshCookie(res, refresh);
  res.json({ token: access, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
};

exports.refresh = async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  const stored = await cache.get(keys.refreshSession(payload.id));
  if (stored !== token) return res.status(401).json({ error: 'Refresh token reuse detected' });

  const { rows } = await pool.query('SELECT id,email,name,role FROM users WHERE id=$1', [payload.id]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'User not found' });

  const { access, refresh: newRefresh } = makeTokens(user);
  await cache.set(keys.refreshSession(user.id), newRefresh, 'EX', REFRESH_EXPIRY_S);
  setRefreshCookie(res, newRefresh);
  res.json({ token: access });
};

exports.logout = async (req, res) => {
  const { jti, id, exp } = req.user;
  const ttl = exp - Math.floor(Date.now() / 1000);
  if (ttl > 0) await cache.set(keys.jwtBlacklist(jti), '1', 'EX', ttl);
  await cache.del(keys.refreshSession(id));
  res.clearCookie('refresh_token');
  res.json({ message: 'Logged out' });
};

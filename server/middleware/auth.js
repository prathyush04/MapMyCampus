const jwt   = require('jsonwebtoken');
const { cache, keys } = require('../utils/cache');

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const token = header.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Check blacklist
  const blacklisted = await cache.get(keys.jwtBlacklist(payload.jti));
  if (blacklisted) return res.status(401).json({ error: 'Token revoked' });

  req.user = payload; // { id, email, role, jti }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { auth, requireRole };

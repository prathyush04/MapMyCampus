const { cache, keys } = require('../utils/cache');

// Sliding window rate limiter — 500 req / 15 min per IP
const WINDOW_SECONDS = 15 * 60;
const MAX_REQUESTS   = 500;

async function rateLimiter(req, res, next) {
  const ip     = req.ip;
  const window = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
  const key    = keys.rateLimit(ip, window);

  const count = await cache.incr(key);
  if (count === 1) await cache.expire(key, WINDOW_SECONDS);

  if (count > MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }
  next();
}

module.exports = rateLimiter;

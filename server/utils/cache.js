const Redis = require('ioredis');

const opts = { maxRetriesPerRequest: 3, family: 4, tls: { rejectUnauthorized: false } };

const publisher  = new Redis(process.env.REDIS_URL, opts);
const subscriber = new Redis(process.env.REDIS_URL, opts);
const cache      = new Redis(process.env.REDIS_URL, opts);


async function connect() {
  await Promise.all([publisher, subscriber, cache].map(
    (client) => new Promise((resolve, reject) => {
      if (client.status === 'ready') return resolve();
      client.once('ready', resolve);
      client.once('error', reject);
    })
  ));
}


const keys = {
  refreshSession : (userId)         => `session:refresh:${userId}`,
  routeCache     : (from, to)       => `route:${from}:${to}`,
  ratings        : (locationId)     => `ratings:${locationId}`,
  jwtBlacklist   : (jti)            => `jwt:blacklist:${jti}`,
  rateLimit      : (ip, window)     => `rl:${ip}:${window}`,
};

module.exports = { publisher, subscriber, cache, connect, keys };

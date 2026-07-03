require('dotenv').config({ path: '../.env' });
const { cache } = require('./utils/cache');

async function flush() {
  await cache.flushdb();
  console.log("Redis cache flushed!");
  process.exit(0);
}
flush();

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { cache } = require('./utils/cache');

(async () => {
  try {
    const keys = await cache.keys('route:*');
    if (keys.length > 0) {
      await cache.del(...keys);
      console.log(`Deleted ${keys.length} route cache keys.`);
    } else {
      console.log('No route cache keys found.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    cache.quit();
  }
})();

const Redis = require('ioredis');
const cache = new Redis();
async function test() {
  await cache.set('route:1:2', 'test1');
  await cache.set('route:3:4', 'test2');
  const toDelete = ['route:1:2', 'route:3:4'];
  const res = await cache.del(toDelete);
  console.log("Deleted count:", res);
  process.exit(0);
}
test();

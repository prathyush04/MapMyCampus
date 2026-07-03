const Redis = require('ioredis');
async function test() {
  const cache = new Redis();
  try {
    await cache.set('test:1', '1');
    const toDelete = ['test:1'];
    await cache.del(toDelete);
    console.log("Success with array");
  } catch (e) {
    console.log("Error with array:", e.message);
  }
  process.exit(0);
}
test();

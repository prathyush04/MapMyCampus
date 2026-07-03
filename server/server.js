require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const cookieParser = require('cookie-parser');
const cron       = require('node-cron');

const { connect: connectRedis, publisher, subscriber } = require('./utils/cache');
const pool       = require('./db/pool');
const rateLimiter  = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN, credentials: true },
});
app.set('io', io);


app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(rateLimiter);
app.use('/uploads', express.static('uploads'));
app.get('/healthz', (req, res) => res.send('OK'));


app.use('/api/auth',          require('./routes/auth'));
app.use('/api/locations',     require('./routes/locations'));
app.use('/api/graph',         require('./routes/graph'));
app.get('/api/route',         require('./utils/asyncWrapper')(require('./controllers/graphController').getRoute));
app.use('/api/shortcuts',          require('./routes/shortcuts'));
app.use('/api/location-requests',  require('./routes/locationRequests'));
app.use('/api/reviews',       require('./routes/reviews'));
app.use('/api/posts',         require('./routes/posts'));
app.use('/api/bookmarks',     require('./routes/bookmarks'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/features', require('./routes/features'));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use(errorHandler);


const REDIS_CHANNEL = 'socket_events';

io.on('connection', (socket) => {
  
  socket.on('join_location', (locationId) => socket.join(`location:${locationId}`));
  socket.on('leave_location', (locationId) => socket.leave(`location:${locationId}`));

  
  socket.on('join_user', (userId) => socket.join(`user:${userId}`));
});


subscriber.subscribe(REDIS_CHANNEL, (err) => {
  if (err) console.error('Redis subscribe error', err);
});

subscriber.on('message', (_channel, message) => {
  const { room, event, data } = JSON.parse(message);
  io.to(room).emit(event, data);
});


app.set('emitToRoom', (room, event, data) => {
  publisher.publish(REDIS_CHANNEL, JSON.stringify({ room, event, data }));
});


cron.schedule('0 * * * *', async () => {
  try {
    const { rowCount } = await pool.query('DELETE FROM location_posts WHERE expires_at < NOW()');
    if (rowCount) console.log(`Cron: removed ${rowCount} expired posts`);
  } catch (err) {
    console.error('Cron error', err);
  }
});


const PORT = process.env.PORT || 4000;

(async () => {
  await connectRedis();
  console.log('Redis connected');
  server.listen(PORT, () => console.log(`API listening on :${PORT}`));
})();

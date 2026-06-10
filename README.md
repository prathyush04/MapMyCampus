# mapMyCampus

Interactive campus navigation and discovery platform for college students.

## Stack

| Layer    | Technology                                          |
|----------|-----------------------------------------------------|
| Frontend | React 18 + Vite, Tailwind CSS, react-leaflet, Socket.io client |
| Backend  | Node.js + Express.js, Socket.io                     |
| Auth     | JWT (access, 15m) + bcrypt + httpOnly refresh cookie (7d) |
| Database | PostgreSQL 15 — raw SQL, no ORM                     |
| Cache    | Redis 7 — sessions, route cache, rate limiting, ratings |
| DevOps   | Docker + docker-compose                             |

---

## Quick Start

```bash
# 1. Copy and fill env
cp .env.example .env
# Edit JWT_SECRET, JWT_REFRESH_SECRET, passwords

# 2. Start everything
docker-compose up --build

# Frontend: http://localhost:5173
# API:      http://localhost:4000
```

### Local dev (without Docker)

```bash
# Postgres + Redis must be running locally
cp .env.example .env   # set DATABASE_URL and REDIS_URL

# Backend
cd server && npm install && npm run dev

# Frontend
cd client && npm install && npm run dev
```

---

## Default Admin

After first boot the seed creates:
- Email: `admin@university.edu`
- Password: `Admin1234!`

**Regenerate the bcrypt hash** in `001_init.sql` for real deployments.

---

## Architecture Decisions

### JWT in memory + httpOnly refresh cookie
Access tokens live only in JS module memory (never `localStorage`) to prevent XSS theft.
Refresh tokens live in an httpOnly cookie — invisible to JavaScript — and are also stored in
Redis so they can be revoked server-side on logout (refresh token rotation).

### Raw SQL
All queries use `pg.Pool` directly. The migration in `001_init.sql` is the single source of truth
for the schema. No hidden ORM magic.

### Dijkstra
Implemented from scratch in `server/utils/dijkstra.js` with a binary min-heap.
The full graph is pulled from Postgres once per request (or served from the 24h Redis cache).
Results are cached as `route:{from}:{to}` with a 24-hour TTL; the cache is invalidated when a
shortcut is approved touching either endpoint node.

### Redis pub/sub socket bridge
`publisher` and `subscriber` are separate ioredis clients.
Every socket event is published to the `socket_events` Redis channel, which all API instances
subscribe to and re-emit locally. This makes the real-time layer horizontally scalable.

### Rate limiting
A sliding window counter is implemented manually using Redis `INCR` + `EXPIRE`.
The key is `rl:{ip}:{windowIndex}` where `windowIndex = floor(unixMs / windowMs)`.
Limit: 100 requests per 15-minute window per IP.

### tsvector full-text search
A `BEFORE INSERT OR UPDATE` trigger keeps `search_vector` current on the `locations` table.
Searches use `plainto_tsquery` which is safe against injection and handles stemming.

### Expired post cleanup
`node-cron` runs `DELETE FROM location_posts WHERE expires_at < NOW()` every hour.

---

## Folder Structure

```
/
├── docker-compose.yml
├── .env.example
├── server/
│   ├── server.js              # Express + Socket.io entrypoint
│   ├── package.json
│   ├── Dockerfile
│   ├── db/
│   │   ├── pool.js
│   │   └── migrations/001_init.sql
│   ├── routes/                # Thin Express routers
│   ├── controllers/           # Business logic
│   ├── middleware/
│   │   ├── auth.js            # JWT verify + role check
│   │   ├── rateLimiter.js     # Redis sliding window
│   │   └── errorHandler.js
│   └── utils/
│       ├── dijkstra.js        # Min-heap Dijkstra
│       ├── cache.js           # ioredis clients + key helpers
│       └── asyncWrapper.js
└── client/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── nginx.conf
    ├── Dockerfile
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── api/
        │   ├── axios.js       # Axios instance + auto-refresh interceptor
        │   └── index.js       # All API call wrappers
        ├── context/
        │   ├── AuthContext.jsx
        │   └── SocketContext.jsx
        ├── hooks/
        │   ├── useLocationSocket.js
        │   └── useNotifications.js
        ├── components/
        │   ├── Navbar.jsx
        │   ├── ProtectedRoute.jsx
        │   ├── LocationPanel.jsx
        │   ├── NotificationsDropdown.jsx
        │   ├── CategoryBadge.jsx
        │   └── StarRating.jsx
        ├── pages/
        │   ├── MapPage.jsx
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   ├── AdminDashboard.jsx
        │   └── ProfilePage.jsx
        └── utils/
            └── mapIcons.js
```

---

## API Reference (summary)

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/register` | — |
| POST | `/api/auth/login` | — |
| POST | `/api/auth/refresh` | cookie |
| POST | `/api/auth/logout` | JWT |
| GET  | `/api/locations` | — |
| GET  | `/api/locations/search?q=&category=&minRating=` | — |
| GET  | `/api/locations/:id` | — |
| POST | `/api/locations` | admin |
| PATCH| `/api/locations/:id` | admin |
| GET  | `/api/graph` | — |
| GET  | `/api/route?from=&to=` | — |
| POST | `/api/graph/edges` | admin |
| DELETE | `/api/graph/edges/:id` | admin |
| POST | `/api/graph/nodes` | admin |
| POST | `/api/shortcuts` | student |
| GET  | `/api/shortcuts?status=pending` | admin |
| PATCH| `/api/shortcuts/:id` | admin |
| POST | `/api/reviews` | JWT |
| GET  | `/api/reviews/:locationId` | — |
| POST | `/api/reviews/:id/vote` | JWT |
| POST | `/api/posts` | JWT |
| GET  | `/api/posts/:locationId` | — |
| DELETE | `/api/posts/:id` | JWT |
| POST | `/api/bookmarks/:locationId` | JWT |
| GET  | `/api/bookmarks` | JWT |
| GET  | `/api/notifications` | JWT |
| PATCH | `/api/notifications/read-all` | JWT |

## Campus Map Image

Place a campus map image at `client/public/campus.png`.
Update the `BOUNDS` constant in `MapPage.jsx` and `AdminDashboard.jsx` to match the image pixel dimensions.
The coordinate system uses `L.CRS.Simple` — `lat/lng` in the DB are `[y, x]` pixel coordinates.

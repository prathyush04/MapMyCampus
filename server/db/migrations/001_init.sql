-- 001_init.sql
-- Run order is guaranteed by filename prefix in docker-entrypoint-initdb.d

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ENUMS
CREATE TYPE user_role AS ENUM ('student', 'admin');
CREATE TYPE location_category AS ENUM ('food','academic','sports','admin','medical','facility','other');
CREATE TYPE shortcut_status AS ENUM ('pending','approved','rejected');
CREATE TYPE post_type AS ENUM ('info','warning','event','food');

-- USERS
CREATE TABLE users (
  id           SERIAL PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name         TEXT NOT NULL,
  role         user_role NOT NULL DEFAULT 'student',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LOCATIONS
CREATE TABLE locations (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  category        location_category NOT NULL DEFAULT 'other',
  lat             FLOAT NOT NULL,
  lng             FLOAT NOT NULL,
  operating_hours JSONB,
  photos          TEXT[] DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  search_vector   TSVECTOR,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locations_search ON locations USING GIN(search_vector);
CREATE INDEX idx_locations_category ON locations(category);

-- Trigger to keep search_vector up-to-date
CREATE OR REPLACE FUNCTION locations_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', coalesce(NEW.name,'') || ' ' || coalesce(NEW.description,''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER locations_search_trigger
  BEFORE INSERT OR UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION locations_search_update();

-- GRAPH
CREATE TABLE graph_nodes (
  id          SERIAL PRIMARY KEY,
  location_id INT REFERENCES locations(id) ON DELETE SET NULL,
  x           FLOAT NOT NULL,
  y           FLOAT NOT NULL
);

CREATE TABLE graph_edges (
  id          SERIAL PRIMARY KEY,
  from_node   INT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  to_node     INT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  weight      FLOAT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_edges_from ON graph_edges(from_node);
CREATE INDEX idx_edges_to   ON graph_edges(to_node);

-- SHORTCUT REQUESTS
CREATE TABLE shortcut_requests (
  id           SERIAL PRIMARY KEY,
  requester_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_node    INT NOT NULL,
  to_node      INT NOT NULL,
  description  TEXT,
  status       shortcut_status NOT NULL DEFAULT 'pending',
  reviewed_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- REVIEWS
CREATE TABLE reviews (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id   INT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  rating        INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body          TEXT,
  helpful_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, location_id)
);

CREATE INDEX idx_reviews_location ON reviews(location_id);

-- REVIEW VOTES
CREATE TABLE review_votes (
  user_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  review_id INT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, review_id)
);

-- LOCATION POSTS
CREATE TABLE location_posts (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id INT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  post_type   post_type NOT NULL DEFAULT 'info',
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_location ON location_posts(location_id);
CREATE INDEX idx_posts_expires  ON location_posts(expires_at);

-- BOOKMARKS
CREATE TABLE bookmarks (
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id INT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, location_id)
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  payload    JSONB NOT NULL DEFAULT '{}',
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- SEED: default admin
-- Password: Admin1234! (bcrypt hash below is for demonstration — regenerate in prod)
INSERT INTO users (email, password_hash, name, role)
VALUES ('admin@university.edu',
        '$2b$12$cqcbxvqwN6E83PmGElTDZOMaRzRZ9wNWLpymRZE6BuzvJyt.N66cq',
        'Campus Admin',
        'admin');

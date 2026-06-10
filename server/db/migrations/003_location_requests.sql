CREATE TABLE location_requests (
  id          SERIAL PRIMARY KEY,
  requester_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  description TEXT,
  category    location_category NOT NULL DEFAULT 'other',
  lat         FLOAT NOT NULL,
  lng         FLOAT NOT NULL,
  status      shortcut_status NOT NULL DEFAULT 'pending',
  reviewed_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

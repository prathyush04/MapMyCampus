ALTER TABLE shortcut_requests
  ADD COLUMN IF NOT EXISTS from_lat FLOAT,
  ADD COLUMN IF NOT EXISTS from_lng FLOAT,
  ADD COLUMN IF NOT EXISTS to_lat   FLOAT,
  ADD COLUMN IF NOT EXISTS to_lng   FLOAT;

-- make from_node/to_node nullable since user may not pick existing nodes
ALTER TABLE shortcut_requests ALTER COLUMN from_node DROP NOT NULL;
ALTER TABLE shortcut_requests ALTER COLUMN to_node   DROP NOT NULL;

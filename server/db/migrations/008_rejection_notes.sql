ALTER TABLE shortcut_requests  ADD COLUMN IF NOT EXISTS rejection_note TEXT;
ALTER TABLE location_requests  ADD COLUMN IF NOT EXISTS rejection_note TEXT;

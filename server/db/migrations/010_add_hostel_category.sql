-- Add hostel to location_category enum
ALTER TYPE location_category ADD VALUE IF NOT EXISTS 'hostel';

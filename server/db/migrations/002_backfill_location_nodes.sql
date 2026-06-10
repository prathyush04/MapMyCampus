-- Backfill graph nodes for locations that don't already have one
INSERT INTO graph_nodes (x, y, location_id)
SELECT l.lng, l.lat, l.id
FROM locations l
WHERE NOT EXISTS (
  SELECT 1 FROM graph_nodes n WHERE n.location_id = l.id
);

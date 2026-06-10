-- Delete duplicate graph nodes within 5 metres of each other
-- Keeps the node with a location_id (or the lower id if neither has one)
DELETE FROM graph_nodes
WHERE id IN (
  SELECT DISTINCT LEAST(a.id, b.id)
  FROM graph_nodes a
  JOIN graph_nodes b ON a.id < b.id
  WHERE (
    -- approximate metre distance using lat/lng degrees
    sqrt(
      power((a.y - b.y) * 110540, 2) +
      power((a.x - b.x) * 111320 * cos(radians((a.y + b.y) / 2)), 2)
    )
  ) BETWEEN 0 AND 5
  -- only delete the one without a location_id, or the lower id if both are the same
  AND (
    (LEAST(a.id, b.id) = a.id AND a.location_id IS NULL) OR
    (LEAST(a.id, b.id) = b.id AND b.location_id IS NULL)
  )
);

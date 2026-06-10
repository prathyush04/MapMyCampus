-- Delete orphan nodes: no location, no edges
DELETE FROM graph_nodes
WHERE location_id IS NULL
AND id NOT IN (
  SELECT from_node FROM graph_edges
  UNION
  SELECT to_node FROM graph_edges
);

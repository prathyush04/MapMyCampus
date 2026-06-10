// Binary min-heap keyed on priority (distance)
class MinHeap {
  constructor() { this.heap = []; }

  push(node) {
    this.heap.push(node);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  get size() { return this.heap.length; }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[parent].dist <= this.heap[i].dist) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l].dist < this.heap[smallest].dist) smallest = l;
      if (r < n && this.heap[r].dist < this.heap[smallest].dist) smallest = r;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

/**
 * @param {Map<number, {to: number, weight: number}[]>} adjList
 * @param {number} source
 * @param {number} target
 * @returns {{ path: number[], totalDistance: number } | null}
 */
function dijkstra(adjList, source, target) {
  const dist = new Map();
  const prev = new Map();
  const heap = new MinHeap();

  dist.set(source, 0);
  heap.push({ id: source, dist: 0 });

  while (heap.size > 0) {
    const { id, dist: d } = heap.pop();
    if (id === target) break;
    if (d > (dist.get(id) ?? Infinity)) continue;

    for (const { to, weight } of (adjList.get(id) || [])) {
      const nd = d + weight;
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd);
        prev.set(to, id);
        heap.push({ id: to, dist: nd });
      }
    }
  }

  if (!dist.has(target)) return null;

  // Reconstruct path
  const path = [];
  let cur = target;
  while (cur !== undefined) {
    path.unshift(cur);
    cur = prev.get(cur);
  }

  return { path, totalDistance: dist.get(target) };
}

module.exports = { dijkstra, MinHeap };

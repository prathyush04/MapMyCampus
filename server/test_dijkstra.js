const { dijkstra, MinHeap } = require('./utils/dijkstra');

const adjList = new Map();
adjList.set(1, [ {to: 2, weight: 10}, {to: 3, weight: 2} ]);
adjList.set(2, [ {to: 1, weight: 10}, {to: 3, weight: 2} ]);
adjList.set(3, [ {to: 1, weight: 2}, {to: 2, weight: 2} ]);

const result = dijkstra(adjList, 1, 2);
console.log("Path 1 to 2:", result);

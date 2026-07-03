const { dijkstra } = require('./utils/dijkstra');
const adjList = new Map();

adjList.set(1, [{to: 2, weight: 10}, {to: 3, weight: 2}]);
adjList.set(2, [{to: 1, weight: 10}, {to: 3, weight: 5}, {to: 4, weight: 2}]);
adjList.set(3, [{to: 1, weight: 2}, {to: 2, weight: 5}, {to: 4, weight: 20}]);
adjList.set(4, [{to: 2, weight: 2}, {to: 3, weight: 20}]);






console.log(dijkstra(adjList, 1, 4));

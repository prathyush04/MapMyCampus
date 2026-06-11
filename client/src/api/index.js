import api from './axios';

export const getLocations   = ()         => api.get('/api/locations');
export const getLocation    = (id)       => api.get(`/api/locations/${id}`);
export const searchLocations = (params)  => api.get('/api/locations/search', { params });
export const createLocation = (data)     => api.post('/api/locations', data);
export const updateLocation = (id, data) => api.patch(`/api/locations/${id}`, data);
export const deleteLocation = (id)       => api.delete(`/api/locations/${id}`);

export const getGraph  = ()            => api.get('/api/graph');
export const getRoute  = (from, to)    => api.get('/api/route', { params: { from, to } });
export const addEdge   = (data)        => api.post('/api/graph/edges', data);
export const deleteEdge = (id)         => api.delete(`/api/graph/edges/${id}`);
export const addNode   = (data)        => api.post('/api/graph/nodes', data);
export const deleteNode = (id)         => api.delete(`/api/graph/nodes/${id}`);

export const getReviews  = (locationId, page) => api.get(`/api/reviews/${locationId}`, { params: { page } });
export const createReview = (data)             => api.post('/api/reviews', data);
export const voteReview   = (id)               => api.post(`/api/reviews/${id}/vote`);

export const getPosts   = (locationId) => api.get(`/api/posts/${locationId}`);
export const createPost = (data)       => api.post('/api/posts', data);
export const deletePost = (id)         => api.delete(`/api/posts/${id}`);

export const toggleBookmark = (locationId) => api.post(`/api/bookmarks/${locationId}`);
export const getBookmarks   = ()           => api.get('/api/bookmarks');

export const getShortcuts      = (status) => api.get('/api/shortcuts', { params: { status } });
export const getMyShortcuts    = ()        => api.get('/api/shortcuts/mine');
export const createShortcut    = (data)    => api.post('/api/shortcuts', data);
export const reviewShortcut    = (id, status, edits) => api.patch(`/api/shortcuts/${id}`, { status, ...edits });

export const getLocationRequests   = (status) => api.get('/api/location-requests', { params: { status } });
export const getMyLocationRequests = ()        => api.get('/api/location-requests/mine');
export const createLocationRequest = (data)    => api.post('/api/location-requests', data);
export const reviewLocationRequest = (id, status, edits) => api.patch(`/api/location-requests/${id}`, { status, ...edits });


export const getNotifications = () => api.get('/api/notifications');
export const markAllRead      = () => api.patch('/api/notifications/read-all');

export const login    = (data) => api.post('/api/auth/login', data);
export const register = (data) => api.post('/api/auth/register', data);
export const logout   = ()     => api.post('/api/auth/logout');

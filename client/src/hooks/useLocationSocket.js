import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';

export function useLocationSocket(locationId) {
  const socket = useSocket();
  const [posts, setPosts]     = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (!socket || !locationId) return;
    socket.emit('join_location', locationId);

    const onPost   = (p) => setPosts((prev) => [p, ...prev]);
    const onReview = (r) => setReviews((prev) => [r, ...prev.filter(x => x.id !== r.id)]);

    socket.on('new_post',    onPost);
    socket.on('review_added', onReview);

    return () => {
      socket.emit('leave_location', locationId);
      socket.off('new_post',    onPost);
      socket.off('review_added', onReview);
    };
  }, [socket, locationId]);

  const seedPosts   = useCallback((p) => setPosts(p), []);
  const seedReviews = useCallback((r) => setReviews(r), []);

  return { posts, reviews, seedPosts, seedReviews };
}

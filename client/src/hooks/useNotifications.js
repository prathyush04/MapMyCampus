import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getNotifications, markAllNotificationsRead as markAllRead } from '../api';

export function useNotifications() {
  const { user } = useAuth();
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    getNotifications().then(({ data }) => setNotifications(data)).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    const handler = (n) => setNotifications((prev) => [n, ...prev]);
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
  }, [socket]);

  const unread = notifications.filter((n) => !n.is_read).length;

  const readAll = async () => {
    await markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return { notifications, unread, readAll };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { io }          from 'socket.io-client';
import useAuthStore     from '../store/authStore';
import axiosInstance    from '../api/axios';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/* ── type → icon/color config ── */
export const NOTIF_CONFIG = {
  status_change:   { color: '#5aabf0', icon: '⟳'  },
  new_application: { color: '#00c896', icon: '✚'  },
  follow_up:       { color: '#e8a820', icon: '🔔' },
  interview:       { color: '#c084fc', icon: '📅' },
};

const useNotifications = () => {
  const { user }                           = useAuthStore();
  const [notifs,      setNotifs]           = useState([]);
  const [unreadCount, setUnreadCount]      = useState(0);
  const [loading,     setLoading]          = useState(true);
  const socketRef                          = useRef(null);

  /* ── fetch persisted notifications on mount ── */
  const fetchNotifs = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/notifications?limit=25');
      const data = res.data?.notifications || res.data || [];
      setNotifs(data);
      setUnreadCount(res.data?.unreadCount ?? data.filter(n => !n.read).length);
    } catch (e) {
      console.error('fetchNotifs error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifs();
  }, [user, fetchNotifs]);

  /* ── socket connection ── */
  useEffect(() => {
    if (!user) return;

    const socket = io(SOCKET_URL, {
      withCredentials: true,   // sends httpOnly cookie automatically
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Notification socket connected');
    });

    /* ── real-time push ── */
    socket.on('notification', (notif) => {
      setNotifs(prev => [notif, ...prev].slice(0, 25));  // keep latest 25
      setUnreadCount(prev => prev + 1);
    });

    socket.on('disconnect', () => {
      console.log('Notification socket disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  /* ── mark one as read ── */
  const markRead = useCallback(async (id) => {
    try {
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      await axiosInstance.patch(`/notifications/${id}/read`);
    } catch (e) {
      console.error('markRead error:', e);
    }
  }, []);

  /* ── mark all as read ── */
  const markAllRead = useCallback(async () => {
    try {
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      await axiosInstance.patch('/notifications/read-all');
    } catch (e) {
      console.error('markAllRead error:', e);
    }
  }, []);

  /* ── delete one ── */
  const deleteNotif = useCallback(async (id) => {
    try {
      const wasUnread = notifs.find(n => n.id === id && !n.read);
      setNotifs(prev => prev.filter(n => n.id !== id));
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
      await axiosInstance.delete(`/notifications/${id}`);
    } catch (e) {
      console.error('deleteNotif error:', e);
    }
  }, [notifs]);

  /* ── time ago helper ── */
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return { notifs, unreadCount, loading, markRead, markAllRead, deleteNotif, timeAgo, refetch: fetchNotifs };
};

export default useNotifications;
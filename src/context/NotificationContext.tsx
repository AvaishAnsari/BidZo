import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Notification } from '../types';
import { useAuth } from './AuthContext';
import { getAuthHeaders, handleAuthError } from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/users/me/notifications/`, { headers: getAuthHeaders() });
      const body = await response.json();
      if (!response.ok) {
        if (handleAuthError(response, body)) return;
        throw new Error(body.detail || body.error || 'Could not load notifications.');
      }
      if (Array.isArray(body)) setNotifications(body);
    } catch (error) {
      console.error('[notifications] failed to load', error);
    }
  }, [user]);

  useEffect(() => {
    const clearNotifications = () => setNotifications([]);
    window.addEventListener('bidzo:auth-expired', clearNotifications);
    return () => window.removeEventListener('bidzo:auth-expired', clearNotifications);
  }, []);

  useEffect(() => {
    void loadNotifications();
    if (!user) return;
    const timer = window.setInterval(() => void loadNotifications(), 30_000);
    window.addEventListener('focus', loadNotifications);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', loadNotifications);
    };
  }, [loadNotifications, user]);

  const markAsRead = useCallback(async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/users/me/notifications/${id}/`, {
      method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ read: true }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      if (!handleAuthError(response, body)) throw new Error(body.detail || 'Could not mark notification as read.');
      return;
    }
    setNotifications((previous) => previous.map((notification) => notification.id === id ? { ...notification, read: true } : notification));
  }, []);

  const markAllAsRead = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/users/me/notifications/read-all/`, {
      method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ read: true }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      if (!handleAuthError(response, body)) throw new Error(body.detail || 'Could not mark notifications as read.');
      return;
    }
    setNotifications((previous) => previous.map((notification) => ({ ...notification, read: true })));
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};

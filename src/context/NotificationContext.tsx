import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { useAuth } from './AuthContext';
import type { Notification } from '../types';
import toast from 'react-hot-toast';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const alertedAuctions = useRef<Set<string>>(new Set());
  
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;

    // Fetch initial notifications
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data as Notification[]);
      }
    };

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase.channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
          
          // Show toast alert for real-time notification
          if (!newNotif.read) {
             toast(newNotif.message, {
               icon: newNotif.type === 'outbid' ? '⚠️' : newNotif.type === 'auction_ending' ? '⏰' : '🔔',
             });
          }
        }
      )
      .subscribe();

    // Poll every 60 seconds to check for ending auctions
    const endingCheckInterval = setInterval(async () => {
      if (!isSupabaseConfigured() || !user) return;
      
      const now = new Date();
      const in5Mins = new Date(now.getTime() + 5 * 60000).toISOString();
      const nowIso = now.toISOString();

      const { data: endingAuctions } = await supabase
        .from('auctions')
        .select('id, title, end_time')
        .gt('end_time', nowIso)
        .lt('end_time', in5Mins)
        .eq('status', 'live');

      if (endingAuctions && endingAuctions.length > 0) {
        for (const auction of endingAuctions) {
          if (alertedAuctions.current.has(auction.id)) continue;
          
          // Check if user has participated in this auction
          const { count } = await supabase
            .from('bids')
            .select('*', { count: 'exact', head: true })
            .eq('auction_id', auction.id)
            .eq('user_id', user.id);
            
          if (count && count > 0) {
            alertedAuctions.current.add(auction.id);
            
            // Generate standard notification object mapping to our DB
            await supabase.from('notifications').insert({
              user_id: user.id,
              title: 'Auction About to End!',
              message: `Hurry! The auction "${auction.title}" you bidded on is ending in less than 5 minutes.`,
              type: 'auction_ending'
            });
          }
        }
      }
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(endingCheckInterval);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    if (!isSupabaseConfigured() || !user) return;
    
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', user.id);
  };

  const markAllAsRead = async () => {
    if (!isSupabaseConfigured() || !user) return;

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

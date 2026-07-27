import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';

export interface NotificationPayload {
  userId: string;
  type: 'trade_update' | 'new_message' | 'price_alert' | 'promotional';
  title: string;
  body: string;
  data?: Record<string, any>;
}

export class NotificationService {
  private static vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

  // Request notification permission
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  // Subscribe to push notifications
  static async subscribeToPush(userId: string): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey),
      });

      // Save subscription to database
      await this.saveSubscription(userId, subscription);
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  // Save subscription to Supabase
  private static async saveSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    const subscriptionData = JSON.stringify(subscription);
    
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      subscription: subscriptionData,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to save push subscription:', error);
    }
  }

  // Send notification via Supabase (server-side would use web-push)
  static async sendNotification(payload: NotificationPayload): Promise<void> {
    // This would typically call a Supabase Edge Function
    // For now, we'll store the notification in the database
    const { error } = await supabase.from('notifications').insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      read: false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to save notification:', error);
    }
  }

  // Send trade update notification
  static async sendTradeUpdate(tradeId: string, status: string, userId: string): Promise<void> {
    const statusMessages: Record<string, string> = {
      initiated: 'Trade initiated',
      payment_pending: 'Payment pending',
      payment_confirmed: 'Payment confirmed',
      completed: 'Trade completed',
      cancelled: 'Trade cancelled',
      disputed: 'Trade disputed',
    };

    await this.sendNotification({
      userId,
      type: 'trade_update',
      title: 'Trade Update',
      body: `Your trade status has changed to: ${statusMessages[status] || status}`,
      data: { tradeId, status },
    });
  }

  // Send new message notification
  static async sendNewMessage(tradeId: string, senderId: string, receiverId: string, message: string): Promise<void> {
    await this.sendNotification({
      userId: receiverId,
      type: 'new_message',
      title: 'New Message',
      body: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      data: { tradeId, senderId },
    });
  }

  // Get user notifications
  static async getUserNotifications(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }

    return data || [];
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  // Helper: Convert base64 to Uint8Array
  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }
}

// Hook for using notifications in components
export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const loadNotifications = async () => {
      const data = await NotificationService.getUserNotifications(userId);
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    };

    loadNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        setNotifications((prev) => [payload.new, ...prev]);
        setUnreadCount((prev) => prev + 1);
        
        // Show browser notification if permitted
        if (Notification.permission === 'granted') {
          new Notification(payload.new.title, { body: payload.new.body });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    await NotificationService.markAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  return { notifications, unreadCount, markAsRead };
}

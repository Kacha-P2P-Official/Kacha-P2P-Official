import { supabase } from '@/db/supabase';

export interface ChatMessage {
  id: string;
  trade_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: 'text' | 'image' | 'file';
  file_url?: string;
  read_at?: string;
  created_at: string;
}

export class ChatService {
  // Send a message
  static async sendMessage(
    tradeId: string,
    senderId: string,
    receiverId: string,
    message: string,
    messageType: 'text' | 'image' | 'file' = 'text',
    fileUrl?: string
  ): Promise<ChatMessage | null> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        trade_id: tradeId,
        sender_id: senderId,
        receiver_id: receiverId,
        message,
        message_type: messageType,
        file_url: fileUrl,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to send message:', error);
      return null;
    }

    return data;
  }

  // Get messages for a trade
  static async getTradeMessages(tradeId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('trade_id', tradeId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch messages:', error);
      return [];
    }

    return data || [];
  }

  // Mark messages as read for a trade
  static async markAsRead(tradeId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('mark_trade_messages_read', {
      trade_id_param: tradeId,
      user_id_param: userId,
    });

    if (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }

  // Get unread message count for a user
  static async getUnreadCount(userId: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_unread_message_count', {
      user_id: userId,
    });

    if (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }

    return data || 0;
  }

  // Subscribe to new messages for a trade
  static subscribeToTradeMessages(
    tradeId: string,
    callback: (message: ChatMessage) => void
  ): () => void {
    const channel = supabase
      .channel(`chat-${tradeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `trade_id=eq.${tradeId}`,
        },
        (payload) => {
          callback(payload.new as ChatMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Subscribe to unread count changes
  static subscribeToUnreadCount(
    userId: string,
    callback: (count: number) => void
  ): () => void {
    const channel = supabase
      .channel(`unread-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `receiver_id=eq.${userId}`,
        },
        async () => {
          const count = await ChatService.getUnreadCount(userId);
          callback(count);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

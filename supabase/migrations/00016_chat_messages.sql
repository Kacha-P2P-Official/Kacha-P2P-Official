-- Chat messages table for in-app messaging between trading partners
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  file_url TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_chat_messages_trade_id ON chat_messages(trade_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_id ON chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages(receiver_id, read_at) WHERE read_at IS NULL;

-- RLS policies
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages for trades they participate in
CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id OR
    EXISTS (
      SELECT 1 FROM trades 
      WHERE trades.id = chat_messages.trade_id 
      AND (trades.buyer_id = auth.uid() OR trades.seller_id = auth.uid())
    )
  );

-- Users can insert messages for trades they participate in
CREATE POLICY "Users can insert own chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM trades 
      WHERE trades.id = chat_messages.trade_id 
      AND (trades.buyer_id = auth.uid() OR trades.seller_id = auth.uid())
    )
  );

-- Users can update read_at for messages sent to them
CREATE POLICY "Users can mark messages as read"
  ON chat_messages FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM chat_messages
    WHERE receiver_id = user_id
    AND read_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read for a trade
CREATE OR REPLACE FUNCTION mark_trade_messages_read(trade_id_param UUID, user_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chat_messages
  SET read_at = NOW()
  WHERE trade_id = trade_id_param
  AND receiver_id = user_id_param
  AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

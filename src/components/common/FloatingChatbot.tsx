import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Loader2, Bot } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME: Message = {
  role: 'assistant',
  content: "Hello! I'm Selam, your Kacha trading assistant. I can help you understand how P2P trading works, explain escrow protection, or answer questions about your transactions. How can I help?",
};

export function FloatingChatbot() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  if (!user) return null;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('selam-chat', {
        body: {
          messages: next.map(({ role, content }) => ({ role, content })),
        },
        method: 'POST',
      });

      if (error) {
        const msg = await error?.context?.text?.();
        throw new Error(msg || error.message);
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data?.reply ?? 'Sorry, I had trouble responding. Please try again.' },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again later.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Positioned above mobile bottom nav — bottom-20 on mobile, bottom-4 on md+ */
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div className="w-[calc(100vw-2rem)] max-w-sm flex flex-col rounded-2xl border border-border shadow-[var(--shadow-md)] bg-card overflow-hidden accent-glow">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-foreground text-background">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-accent" />
              <div>
                <p className="text-sm font-heading font-semibold leading-none">Selam</p>
                <p className="text-[10px] opacity-60 font-sans mt-0.5">Kacha AI Assistant</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-background/70 hover:text-background hover:bg-background/10"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 h-72">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[82%] rounded-xl px-3 py-2 text-sm font-sans leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-3 py-2 flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-sans">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask Selam anything…"
              className="font-sans text-sm"
              disabled={loading}
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </div>
      )}

      {/* FAB toggle */}
      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-[var(--shadow-md)] accent-glow bg-accent text-accent-foreground hover:bg-accent/90 border-0 no-select"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close chat' : 'Open Selam chat'}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
    </div>
  );
}

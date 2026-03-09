import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageCircle, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: string;
  message: string;
  created_at: string;
}

interface TicketMessagesProps {
  ticketId: string;
  currentUserId: string;
  currentUserRole: string;
}

export function TicketMessages({ ticketId, currentUserId, currentUserRole }: TicketMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`ticket-messages-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data as Message[]);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);

    await supabase.from('ticket_messages').insert({
      ticket_id: ticketId,
      sender_id: currentUserId,
      sender_role: currentUserRole,
      message: newMessage.trim(),
    });

    setNewMessage('');
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const roleLabel = (role: string) => {
    if (role === 'farmer') return 'Farmer';
    if (role === 'vet') return 'Vet';
    return 'Admin';
  };

  const roleClass = (role: string) => {
    if (role === 'farmer') return 'bg-primary/10 text-primary';
    if (role === 'vet') return 'bg-success/10 text-success-foreground';
    return 'bg-warning/10 text-warning-foreground';
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          Messages
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={scrollRef} className="max-h-48 overflow-y-auto space-y-2 mb-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No messages yet</p>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <Badge variant="outline" className={cn("text-[10px] px-1 py-0", roleClass(msg.sender_role))}>
                      {roleLabel(msg.sender_role)}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={cn(
                    "px-3 py-1.5 rounded-lg text-sm max-w-[85%]",
                    isMine ? "bg-primary text-primary-foreground" : "bg-secondary"
                  )}>
                    {msg.message}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-sm"
          />
          <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { cn, getInitials, formatRelativeTime } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, X, Minimize2, Maximize2, Circle } from 'lucide-react';
import { ActiveUsers } from '@/components/active-users';

interface ChatMessage {
  id: string;
  content: string;
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
  createdAt: string;
}

interface WorkspaceChatProps {
  workspaceId: string;
  currentUser: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export function WorkspaceChat({ workspaceId, currentUser }: WorkspaceChatProps) {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const channelName = `workspace-chat:${workspaceId}`;
  const presenceChannel = `workspace-presence:${workspaceId}`;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      setUnreadCount(0);
    }
  }, [messages, isOpen, isMinimized, scrollToBottom]);

  useEffect(() => {
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'message' }, (payload) => {
        const message = payload.payload as ChatMessage;
        setMessages((current) => [...current, message]);

        // Increment unread if chat is closed or minimized
        if (!isOpen || isMinimized) {
          setUnreadCount((count) => count + 1);
        }
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, supabase, isOpen, isMinimized]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !channelRef.current || !isConnected) return;

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      content: newMessage.trim(),
      user: {
        id: currentUser.id,
        name: currentUser.name,
        avatarUrl: currentUser.avatarUrl,
      },
      createdAt: new Date().toISOString(),
    };

    // Optimistic update
    setMessages((current) => [...current, message]);
    setNewMessage('');

    await channelRef.current.send({
      type: 'broadcast',
      event: 'message',
      payload: message,
    });
  }, [newMessage, isConnected, currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  // Floating chat button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:bg-primary/90 active:scale-95"
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  // Chat panel
  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 flex flex-col rounded-xl border border-border bg-background shadow-2xl transition-all duration-200',
        isMinimized ? 'h-14 w-80' : 'h-[32rem] w-96'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-xl border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-1.5">
            <MessageCircle className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Team Chat</h3>
            {!isMinimized && (
              <div className="flex items-center gap-1.5">
                {isConnected ? (
                  <>
                    <Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500" />
                    <span className="text-[10px] text-muted-foreground">Connected</span>
                  </>
                ) : (
                  <>
                    <Circle className="h-1.5 w-1.5 animate-pulse fill-yellow-500 text-yellow-500" />
                    <span className="text-[10px] text-muted-foreground">Connecting...</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? (
              <Maximize2 className="h-3.5 w-3.5" />
            ) : (
              <Minimize2 className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Active Users */}
          <div className="border-b border-border bg-muted/20 px-4 py-3">
            <ActiveUsers channelName={presenceChannel} currentUser={currentUser} compact />
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <MessageCircle className="mb-2 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No messages yet</p>
                <p className="text-xs text-muted-foreground/70">Start the conversation!</p>
              </div>
            ) : (
              messages.map((message, index) => {
                const isOwn = message.user.id === currentUser.id;
                const prevMessage = index > 0 ? messages[index - 1] : null;
                const showHeader = !prevMessage || prevMessage.user.id !== message.user.id;

                return (
                  <div key={message.id} className={cn('flex gap-2', isOwn && 'flex-row-reverse')}>
                    {showHeader && !isOwn && (
                      <div className="flex-shrink-0">
                        {message.user.avatarUrl ? (
                          <img
                            src={message.user.avatarUrl}
                            alt={message.user.name}
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                            {getInitials(message.user.name)}
                          </div>
                        )}
                      </div>
                    )}
                    {!showHeader && !isOwn && <div className="w-7" />}

                    <div className={cn('max-w-[75%]', isOwn && 'items-end')}>
                      {showHeader && (
                        <p
                          className={cn(
                            'mb-0.5 text-[10px] text-muted-foreground',
                            isOwn ? 'text-right' : 'text-left'
                          )}
                        >
                          {isOwn ? 'You' : message.user.name}
                        </p>
                      )}
                      <div
                        className={cn(
                          'rounded-2xl px-3 py-2 text-sm',
                          isOwn
                            ? 'rounded-br-md bg-primary text-primary-foreground'
                            : 'rounded-bl-md bg-muted text-foreground'
                        )}
                      >
                        {message.content}
                      </div>
                      <p
                        className={cn(
                          'mt-0.5 text-[9px] text-muted-foreground',
                          isOwn ? 'text-right' : 'text-left'
                        )}
                      >
                        {formatRelativeTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-border p-3">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={!isConnected}
                className="h-9 flex-1 text-sm"
              />
              <Button
                type="submit"
                size="icon"
                className="h-9 w-9"
                disabled={!isConnected || !newMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

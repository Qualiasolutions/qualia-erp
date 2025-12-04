'use client';

import { useRef, useEffect } from 'react';
import { useHubMessages } from '@/hooks/use-hub-messages';
import { HubMessage } from './hub-message';
import { HubChatInput } from './hub-chat-input';
import { Loader2, MessageCircle } from 'lucide-react';

interface ChatPanelProps {
  workspaceId: string;
}

export function ChatPanel({ workspaceId }: ChatPanelProps) {
  const { messages, isLoading, isSending, error, hasMore, sendMessage, loadMore } = useHubMessages({
    workspaceId,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView();
    }
  }, [isLoading, messages.length]);

  // Load more on scroll to top
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target.scrollTop === 0 && hasMore && !isLoading) {
      loadMore();
    }
  };

  const handleSend = async (content: string) => {
    await sendMessage(content);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Chat Header */}
      <div className="border-b border-border p-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-qualia-500" />
          <h2 className="text-sm font-semibold">Team Chat</h2>
          <span className="text-xs text-muted-foreground">{messages.length} messages</span>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 space-y-1 overflow-y-auto p-4"
        onScroll={handleScroll}
      >
        {/* Load More Indicator */}
        {hasMore && (
          <div className="flex justify-center pb-4">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <button
                onClick={loadMore}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Load older messages
              </button>
            )}
          </div>
        )}

        {/* Initial Loading */}
        {isLoading && messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="mb-2 h-6 w-6 animate-spin" />
            <p className="text-sm">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <MessageCircle className="mb-3 h-12 w-12 opacity-30" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="mt-1 text-xs">Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const showAuthor =
                !prevMessage ||
                prevMessage.author?.id !== message.author?.id ||
                new Date(message.created_at).getTime() -
                  new Date(prevMessage.created_at).getTime() >
                  5 * 60 * 1000; // 5 min gap

              return <HubMessage key={message.id} message={message} showAuthor={showAuthor} />;
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="border-t border-red-500/20 bg-red-500/10 px-4 py-2">
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      {/* Chat Input */}
      <HubChatInput onSend={handleSend} isSending={isSending} />
    </div>
  );
}

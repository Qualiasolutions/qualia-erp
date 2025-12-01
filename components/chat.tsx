'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

export default function Chat() {
    const [input, setInput] = useState('');
    const { messages, status, sendMessage, error } = useChat({
        transport: new DefaultChatTransport({
            api: '/api/chat',
        }),
    });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isLoading = status === 'submitted' || status === 'streaming';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            sendMessage({ text: input });
            setInput('');
        }
    };

    const handleQuickAction = (query: string) => {
        sendMessage({ text: query });
    };

    const getMessageContent = (message: typeof messages[0]) => {
        if (!message.parts) return '';
        return message.parts
            .filter(part => part.type === 'text')
            .map(part => (part as { type: 'text'; text: string }).text)
            .join('');
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center mt-6 fade-in">
                        <div className="inline-block p-3 rounded-xl bg-primary/10 mb-3">
                            <Sparkles className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-foreground font-medium text-sm mb-1">How can I help?</p>
                        <p className="text-xs text-muted-foreground mb-4">
                            Ask about issues, projects, or teams
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {['Show my issues', 'Project status', 'Recent activity'].map((q) => (
                                <button
                                    key={q}
                                    onClick={() => handleQuickAction(q)}
                                    className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="rounded-lg p-3 bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-600 dark:text-red-400">Error: {error.message}</p>
                    </div>
                )}

                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={`flex gap-2.5 slide-in ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                m.role === 'user'
                                    ? 'bg-primary'
                                    : 'bg-secondary'
                            }`}
                        >
                            {m.role === 'user' ? (
                                <User className="w-3.5 h-3.5 text-primary-foreground" />
                            ) : (
                                <Bot className="w-3.5 h-3.5 text-primary" />
                            )}
                        </div>
                        <div
                            className={`rounded-lg px-3 py-2 max-w-[85%] text-sm ${
                                m.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary text-foreground'
                            }`}
                        >
                            <div className="whitespace-pre-wrap leading-relaxed">{getMessageContent(m)}</div>
                        </div>
                    </div>
                ))}

                {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                    <div className="flex gap-2.5 slide-in">
                        <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                            <Bot className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="bg-secondary rounded-lg px-3 py-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                <span className="text-xs">Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-border">
                <div className="flex gap-2">
                    <input
                        className="flex-1 px-3 py-2 text-sm bg-secondary rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your projects..."
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
    );
}

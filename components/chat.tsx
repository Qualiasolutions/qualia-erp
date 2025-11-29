'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Send, Bot, User, Loader2 } from 'lucide-react';
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
        <div className="flex flex-col h-[600px] w-full max-w-md border border-border rounded-lg overflow-hidden bg-background shadow-xl">
            {/* Header */}
            <div className="bg-card p-4 border-b border-border flex items-center gap-2">
                <Bot className="w-5 h-5 text-qualia-400" />
                <h3 className="font-semibold text-foreground">Qualia AI</h3>
                {isLoading && (
                    <Loader2 className="w-4 h-4 ml-auto animate-spin text-qualia-400" />
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-muted-foreground mt-10">
                        <Bot className="w-12 h-12 mx-auto mb-3 text-qualia-500/50" />
                        <p>How can I help you today?</p>
                        <p className="text-sm mt-2 text-muted-foreground/70">
                            Ask about your issues, projects, or teams
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2 justify-center">
                            {['Show my issues', 'Project status', 'Recent activity'].map((q) => (
                                <button
                                    key={q}
                                    onClick={() => handleQuickAction(q)}
                                    className="text-xs px-3 py-1.5 bg-card border border-border rounded-full hover:bg-muted transition-colors text-foreground"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                        Error: {error.message}
                    </div>
                )}

                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                m.role === 'user'
                                    ? 'bg-qualia-600 text-white'
                                    : 'bg-muted'
                            }`}
                        >
                            {m.role === 'user' ? (
                                <User className="w-4 h-4" />
                            ) : (
                                <Bot className="w-4 h-4 text-qualia-400" />
                            )}
                        </div>
                        <div
                            className={`rounded-lg p-3 max-w-[80%] text-sm ${
                                m.role === 'user'
                                    ? 'bg-qualia-600 text-white'
                                    : 'bg-card text-foreground border border-border'
                            }`}
                        >
                            <div className="whitespace-pre-wrap">{getMessageContent(m)}</div>
                        </div>
                    </div>
                ))}

                {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-qualia-400" />
                        </div>
                        <div className="bg-card border border-border rounded-lg p-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-background">
                <div className="flex gap-2">
                    <input
                        className="flex-1 px-3 py-2 text-sm bg-card border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-qualia-500 focus:border-transparent"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your projects, issues, or teams..."
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="bg-qualia-600 text-white p-2 rounded-md hover:bg-qualia-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
    );
}

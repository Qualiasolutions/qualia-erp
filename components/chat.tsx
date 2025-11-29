'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
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
        <div className="flex flex-col h-[600px] w-full glass-card rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
                <div className="relative">
                    <div className="p-2 rounded-xl bg-qualia-500/20 border border-qualia-500/30">
                        <Bot className="w-5 h-5 text-qualia-400" />
                    </div>
                    <div className="absolute -inset-1 bg-qualia-500/20 blur-lg rounded-xl -z-10" />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-sm">Qualia AI</h3>
                    <p className="text-[10px] text-muted-foreground">Always ready to help</p>
                </div>
                {isLoading && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-qualia-500/10 border border-qualia-500/20">
                        <Loader2 className="w-3 h-3 animate-spin text-qualia-400" />
                        <span className="text-[10px] font-medium text-qualia-400">Thinking</span>
                    </div>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center mt-8 animate-fade-in">
                        <div className="relative inline-block mb-4">
                            <div className="p-4 rounded-2xl bg-qualia-500/10 border border-qualia-500/20">
                                <Sparkles className="w-8 h-8 text-qualia-400" />
                            </div>
                            <div className="absolute -inset-2 bg-qualia-500/10 blur-xl rounded-2xl -z-10" />
                        </div>
                        <p className="text-foreground font-medium mb-1">How can I help you today?</p>
                        <p className="text-sm text-muted-foreground mb-6">
                            Ask about your issues, projects, or teams
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {['Show my issues', 'Project status', 'Recent activity'].map((q) => (
                                <button
                                    key={q}
                                    onClick={() => handleQuickAction(q)}
                                    className="text-xs px-4 py-2 glass rounded-xl text-foreground hover:bg-white/[0.06] hover:border-qualia-500/30 transition-all duration-300 hover:scale-105"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="glass rounded-xl p-4 border-red-500/20 bg-red-500/5">
                        <p className="text-sm text-red-400">Error: {error.message}</p>
                    </div>
                )}

                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={`flex gap-3 animate-slide-in ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                m.role === 'user'
                                    ? 'bg-gradient-to-br from-qualia-500 to-qualia-600'
                                    : 'bg-white/[0.05] border border-white/[0.08]'
                            }`}
                        >
                            {m.role === 'user' ? (
                                <User className="w-4 h-4 text-black" />
                            ) : (
                                <Bot className="w-4 h-4 text-qualia-400" />
                            )}
                        </div>
                        <div
                            className={`rounded-2xl p-4 max-w-[80%] text-sm ${
                                m.role === 'user'
                                    ? 'bg-gradient-to-br from-qualia-500 to-qualia-600 text-black font-medium'
                                    : 'glass text-foreground'
                            }`}
                        >
                            <div className="whitespace-pre-wrap leading-relaxed">{getMessageContent(m)}</div>
                        </div>
                    </div>
                ))}

                {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                    <div className="flex gap-3 animate-slide-in">
                        <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-qualia-400" />
                        </div>
                        <div className="glass rounded-2xl p-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-qualia-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 bg-qualia-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 bg-qualia-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                <span className="text-xs">Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-white/[0.06]">
                <div className="flex gap-3">
                    <input
                        className="flex-1 px-4 py-3 text-sm glass rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-qualia-500/50 focus:border-qualia-500/30 transition-all"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your projects, issues, or teams..."
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="p-3 rounded-xl bg-gradient-to-br from-qualia-500 to-qualia-600 text-black hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
    );
}

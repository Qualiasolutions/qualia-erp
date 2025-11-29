'use client';

import { useChat } from '@ai-sdk/react';
import { Send, Bot, User } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

export default function Chat() {
    const [input, setInput] = useState('');
    const { messages, sendMessage, status } = useChat();
    const messagesEndRef = useRef<HTMLDivElement>(null);

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

    const isLoading = status === 'streaming' || status === 'submitted';

    return (
        <div className="flex flex-col h-[600px] w-full max-w-md border rounded-lg overflow-hidden bg-background shadow-xl">
            <div className="bg-muted p-4 border-b flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <h3 className="font-semibold">Qualia AI</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-muted-foreground mt-10">
                        <p>How can I help you with your projects today?</p>
                    </div>
                )}

                {messages.map(m => (
                    <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            }`}>
                            {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                        <div className={`rounded-lg p-3 max-w-[80%] text-sm ${m.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}>
                            {m.parts.map((part, index) => {
                                if (part.type === 'text') {
                                    return <span key={index}>{part.text}</span>;
                                }
                                return null;
                            })}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4" />
                        </div>
                        <div className="bg-muted rounded-lg p-3 text-sm">
                            <span className="animate-pulse">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
                <div className="flex gap-2">
                    <input
                        className="flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask anything about Qualia..."
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="bg-primary text-primary-foreground p-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
    );
}

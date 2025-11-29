'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Send, Bot, User } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

export default function Chat() {
    const [input, setInput] = useState('');
    const { messages, sendMessage, status } = useChat({
        transport: new DefaultChatTransport({
            api: '/api/chat',
        }),
    });
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
        <div className="flex flex-col h-[600px] w-full max-w-md border border-[#2C2C2C] rounded-lg overflow-hidden bg-[#141414] shadow-xl">
            <div className="bg-[#1C1C1C] p-4 border-b border-[#2C2C2C] flex items-center gap-2">
                <Bot className="w-5 h-5 text-qualia-400" />
                <h3 className="font-semibold text-white">Qualia AI</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 mt-10">
                        <Bot className="w-12 h-12 mx-auto mb-3 text-qualia-500/50" />
                        <p>How can I help you with your projects today?</p>
                        <p className="text-sm mt-2 text-gray-600">Ask about your issues, projects, or teams</p>
                    </div>
                )}

                {messages.map(m => (
                    <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            m.role === 'user' ? 'bg-qualia-600 text-white' : 'bg-[#2C2C2C]'
                        }`}>
                            {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-qualia-400" />}
                        </div>
                        <div className={`rounded-lg p-3 max-w-[80%] text-sm ${
                            m.role === 'user'
                                ? 'bg-qualia-600 text-white'
                                : 'bg-[#1C1C1C] text-gray-200 border border-[#2C2C2C]'
                        }`}>
                            {m.parts.map((part, index) => {
                                if (part.type === 'text') {
                                    return <span key={index} className="whitespace-pre-wrap">{part.text}</span>;
                                }
                                return null;
                            })}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#2C2C2C] flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-qualia-400" />
                        </div>
                        <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-3 text-sm text-gray-400">
                            <span className="animate-pulse">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t border-[#2C2C2C] bg-[#141414]">
                <div className="flex gap-2">
                    <input
                        className="flex-1 px-3 py-2 text-sm bg-[#1C1C1C] border border-[#2C2C2C] rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-qualia-500 focus:border-transparent"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your projects, issues, or teams..."
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

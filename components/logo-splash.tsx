'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export function LogoSplash() {
    const [isVisible, setIsVisible] = useState(true);
    const [isAnimating, setIsAnimating] = useState(true);

    useEffect(() => {
        // Check if user has seen splash before in this session
        const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
        if (hasSeenSplash) {
            setIsVisible(false);
            return;
        }

        // Start fade out after animation completes
        const timer = setTimeout(() => {
            setIsAnimating(false);
            setTimeout(() => {
                setIsVisible(false);
                sessionStorage.setItem('hasSeenSplash', 'true');
            }, 500);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-500 ${
                isAnimating ? 'opacity-100' : 'opacity-0'
            }`}
        >
            <div className="flex flex-col items-center gap-6">
                {/* Logo with animation */}
                <div className="relative">
                    {/* Glow effect */}
                    <div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full scale-150 animate-pulse" />

                    {/* Logo container with animations */}
                    <div className="relative animate-logo-entrance">
                        <Image
                            src="/logo.webp"
                            alt="Qualia Solutions"
                            width={120}
                            height={120}
                            className="rounded-2xl shadow-2xl"
                            priority
                        />

                        {/* Shine effect */}
                        <div className="absolute inset-0 rounded-2xl overflow-hidden">
                            <div className="absolute inset-0 animate-shine bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full" />
                        </div>
                    </div>
                </div>

                {/* Text with staggered animation */}
                <div className="text-center animate-text-entrance">
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">
                        Qualia Solutions
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Internal Suite
                    </p>
                </div>

                {/* Loading indicator */}
                <div className="flex gap-1.5 animate-dots-entrance">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        </div>
    );
}

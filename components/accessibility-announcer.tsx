'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AnnouncerContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AnnouncerContext = createContext<AnnouncerContextType | undefined>(undefined);

export function useAnnouncer() {
  const context = useContext(AnnouncerContext);
  if (!context) {
    // Return a no-op if used outside provider (graceful fallback)
    return { announce: () => {} };
  }
  return context;
}

interface AccessibilityAnnouncerProps {
  children: ReactNode;
}

export function AccessibilityAnnouncer({ children }: AccessibilityAnnouncerProps) {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Clear first to ensure announcement even for same message
    if (priority === 'assertive') {
      setAssertiveMessage('');
      setTimeout(() => setAssertiveMessage(message), 50);
    } else {
      setPoliteMessage('');
      setTimeout(() => setPoliteMessage(message), 50);
    }

    // Clear after announcement
    setTimeout(() => {
      if (priority === 'assertive') {
        setAssertiveMessage('');
      } else {
        setPoliteMessage('');
      }
    }, 1000);
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      {/* Screen reader only live regions */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {politeMessage}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  );
}

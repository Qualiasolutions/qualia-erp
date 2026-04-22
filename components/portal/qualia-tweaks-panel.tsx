'use client';

import { useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

import { cn } from '@/lib/utils';
import { useDensity } from '@/components/density-provider';
import type { UIDensity } from '@/app/actions/ui-preferences';
import { clearViewAs } from '@/app/actions/view-as';
import { QIcon } from '@/components/ui/q-icon';

export function QualiaTweaksPanel({
  onClose,
  onViewAs,
  isImpersonating,
}: {
  onClose: () => void;
  onViewAs: () => void;
  isImpersonating: boolean;
}) {
  const router = useRouter();
  const { theme, setTheme, systemTheme } = useTheme();
  const { density, setDensity } = useDensity();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [isClearing, startClear] = useTransition();

  const handleClearImpersonation = () => {
    startClear(async () => {
      await clearViewAs();
      router.refresh();
      onClose();
    });
  };

  // Resolve active theme (treat 'system' as whatever the OS prefers)
  const activeTheme = theme === 'system' ? (systemTheme ?? 'dark') : (theme ?? 'dark');

  // Close on Escape or outside click
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    // Delay outside-click listener one tick so the opening click doesn't close it
    const id = window.setTimeout(() => document.addEventListener('mousedown', onClick), 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
      window.clearTimeout(id);
    };
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="q-page-enter fixed bottom-5 right-5 z-50 w-[280px] rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--elevation-modal)]"
      role="dialog"
      aria-label="Admin tweaks"
    >
      <div className="mb-3.5 flex items-center justify-between">
        <span className="q-eyebrow">Tweaks</span>
        <button
          type="button"
          onClick={onClose}
          className="focus-visible:ring-[var(--accent-teal)]/40 rounded p-1 text-[var(--text-mute)] hover:bg-[var(--surface-hi)] hover:text-[var(--text)] focus:outline-none focus-visible:ring-2"
          aria-label="Close tweaks"
        >
          <QIcon name="x" size={14} />
        </button>
      </div>

      {/* Role impersonation (admin-only surface) */}
      <div className="mb-3.5">
        <div className="q-label-mono mb-1.5">Role</div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewAs();
            }}
            className="flex-1 cursor-pointer rounded-md border border-[var(--line)] bg-[var(--bg-sub)] px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--text-soft)] hover:bg-[var(--surface-hi)]"
          >
            {isImpersonating ? 'Switch view' : 'View as…'}
          </button>
          {isImpersonating ? (
            <button
              type="button"
              onClick={handleClearImpersonation}
              disabled={isClearing}
              className="cursor-pointer rounded-md border border-[var(--line)] bg-[var(--bg-sub)] px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--text-soft)] hover:bg-[var(--surface-hi)] disabled:opacity-50"
            >
              {isClearing ? '…' : 'Exit'}
            </button>
          ) : null}
        </div>
      </div>

      {/* Theme */}
      <div className="mb-3.5">
        <div className="q-label-mono mb-1.5">Theme</div>
        <div className="grid grid-cols-2 gap-1 rounded-md bg-[var(--bg-sub)] p-[3px]">
          {(['light', 'dark'] as const).map((t) => {
            const selected = activeTheme === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={cn(
                  'flex cursor-pointer items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[11.5px] capitalize transition-colors duration-150',
                  selected
                    ? 'bg-[var(--surface)] font-semibold text-[var(--text)] shadow-[var(--elevation-resting)]'
                    : 'font-medium text-[var(--text-mute)] hover:text-[var(--text-soft)]'
                )}
                aria-pressed={selected}
              >
                <QIcon name={t === 'light' ? 'sun' : 'moon'} size={12} />
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Density */}
      <div>
        <div className="q-label-mono mb-1.5">Density</div>
        <div className="grid grid-cols-3 gap-1 rounded-md bg-[var(--bg-sub)] p-[3px]">
          {(['compact', 'default', 'spacious'] as const satisfies readonly UIDensity[]).map((d) => {
            const selected = density === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDensity(d)}
                className={cn(
                  'cursor-pointer rounded px-2 py-1.5 text-[11.5px] capitalize transition-colors duration-150',
                  selected
                    ? 'bg-[var(--surface)] font-semibold text-[var(--text)] shadow-[var(--elevation-resting)]'
                    : 'font-medium text-[var(--text-mute)] hover:text-[var(--text-soft)]'
                )}
                aria-pressed={selected}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

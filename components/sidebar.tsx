'use client';

import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutGrid,
  MessageSquare,
  Settings,
  Folder,
  Calendar,
  Building2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
// import { ActiveUsers } from '@/components/active-users'; // Unused
import { WorkspaceSelector } from '@/components/workspace-selector';
import { useSidebar } from '@/components/sidebar-provider';

// Lazy load Chat component - only loaded when AI panel is opened
const Chat = dynamic(() => import('@/components/chat'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  ),
});

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutGrid },
  { name: 'Hub', href: '/hub', icon: MessageSquare },
  { name: 'Projects', href: '/projects', icon: Folder },
  { name: 'Clients', href: '/clients', icon: Building2 },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
];

const bottomNav = [{ name: 'Settings', href: '/settings', icon: Settings }];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);

  return (
    <>
      <aside
        className={cn(
          'flex h-screen flex-col border-r border-border bg-card transition-all duration-300 ease-out',
          isCollapsed ? 'w-[68px]' : 'w-60'
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex items-center border-b border-border',
            isCollapsed ? 'h-14 justify-center px-3' : 'h-16 px-4'
          )}
        >
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <Image
                src="/logo.webp"
                alt="Qualia Solutions"
                width={isCollapsed ? 32 : 40}
                height={isCollapsed ? 32 : 40}
                className="rounded-lg transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-foreground">
                  Qualia Solutions
                </span>
                <span className="-mt-0.5 text-[10px] text-muted-foreground">Internal Suite</span>
              </div>
            )}
          </Link>
        </div>

        {/* Workspace Selector */}
        {!isCollapsed && (
          <div className="border-b border-border px-3 py-3">
            <WorkspaceSelector />
          </div>
        )}

        {/* Main Navigation */}
        <nav className={cn('flex-1 py-3', isCollapsed ? 'px-2' : 'px-3')}>
          <div className="space-y-0.5">
            {navigation.map((item, index) => {
              const isActive =
                pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={isCollapsed ? item.name : undefined}
                  className={cn(
                    'slide-in flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-200',
                    isCollapsed ? 'mx-auto h-10 w-10 justify-center' : 'h-9 px-2.5',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <item.icon
                    className={cn(
                      'flex-shrink-0 transition-colors duration-200',
                      isCollapsed ? 'h-[18px] w-[18px]' : 'h-4 w-4',
                      isActive && 'text-primary'
                    )}
                  />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* AI Assistant Card */}
        {!isCollapsed && (
          <div className="px-3 pb-2">
            <button
              type="button"
              onClick={() => setIsAiPanelOpen(true)}
              className="w-full cursor-pointer rounded-lg border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3 text-left transition-all hover:border-primary/30 hover:from-primary/15 hover:via-primary/10"
            >
              <div className="flex items-start gap-2.5">
                <div className="rounded-md bg-primary/15 p-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">AI Assistant</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                    Ask anything about your projects
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Collapsed AI Icon */}
        {isCollapsed && (
          <div className="flex justify-center px-2 pb-2">
            <button
              type="button"
              onClick={() => setIsAiPanelOpen(true)}
              className="rounded-lg border border-primary/20 bg-primary/10 p-2.5 transition-colors hover:bg-primary/15"
              title="AI Assistant"
            >
              <Sparkles className="h-4 w-4 text-primary" />
            </button>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className={cn('border-t border-border py-2', isCollapsed ? 'px-2' : 'px-3')}>
          {bottomNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-200',
                  isCollapsed ? 'mx-auto h-10 w-10 justify-center' : 'h-9 px-2.5',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
                )}
              >
                <item.icon
                  className={cn('flex-shrink-0', isCollapsed ? 'h-[18px] w-[18px]' : 'h-4 w-4')}
                />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </div>

        {/* Collapse Toggle */}
        <div className={cn('border-t border-border py-2', isCollapsed ? 'px-2' : 'px-3')}>
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              'flex items-center gap-2 rounded-lg text-[13px] font-medium text-muted-foreground transition-all duration-200 hover:bg-secondary/80 hover:text-foreground',
              isCollapsed ? 'mx-auto h-10 w-10 justify-center' : 'h-9 w-full px-2.5'
            )}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* AI Assistant Slide-out Panel */}
      {isAiPanelOpen && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-black/50 duration-200 animate-in fade-in"
            onClick={() => setIsAiPanelOpen(false)}
            aria-label="Close AI Assistant"
          />
          {/* Panel */}
          <div className="fixed left-60 top-0 z-50 flex h-screen w-[400px] flex-col border-r border-border bg-card shadow-2xl duration-300 animate-in slide-in-from-left">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-primary/15 p-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold text-foreground">AI Assistant</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAiPanelOpen(false)}
                className="rounded-md p-1.5 transition-colors hover:bg-secondary"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Chat />
            </div>
          </div>
        </>
      )}
    </>
  );
}

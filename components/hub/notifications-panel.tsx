'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Bell,
  CheckCircle2,
  UserPlus,
  MessageSquare,
  AtSign,
  AlertCircle,
  Check,
  CheckCheck,
  Loader2,
  BellOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotificationsPanelProps {
  workspaceId: string;
}

type NotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'task_updated'
  | 'comment_added'
  | 'mention'
  | 'system';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const NOTIFICATION_CONFIG: Record<
  NotificationType,
  { icon: typeof Bell; color: string; bgColor: string }
> = {
  task_assigned: {
    icon: UserPlus,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  task_completed: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  task_updated: {
    icon: AlertCircle,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  comment_added: {
    icon: MessageSquare,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  mention: {
    icon: AtSign,
    color: 'text-qualia-500',
    bgColor: 'bg-qualia-500/10',
  },
  system: {
    icon: Bell,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
};

export function NotificationsPanel({ workspaceId }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to load notifications:', error);
    } else {
      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    }

    setIsLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    loadNotifications();

    // Set up realtime subscription
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, loadNotifications]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  // Mark all as read
  const markAllAsRead = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with actions */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={markAllAsRead}>
            <CheckCheck className="h-3 w-3" />
            Mark all read
          </Button>
        </div>
      )}

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <BellOff className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">No notifications</p>
            <p className="text-xs">You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {notifications.map((notification, index) => {
              const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.system;
              const Icon = config.icon;

              return (
                <div
                  key={notification.id}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                  className={cn(
                    'group relative flex cursor-pointer gap-3 rounded-lg p-3 transition-colors',
                    notification.is_read
                      ? 'bg-transparent hover:bg-muted/50'
                      : 'bg-qualia-500/5 hover:bg-qualia-500/10',
                    'animate-in slide-in-from-right-2'
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {/* Unread indicator */}
                  {!notification.is_read && (
                    <div className="absolute left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-qualia-500" />
                  )}

                  {/* Icon */}
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      config.bgColor
                    )}
                  >
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-sm leading-tight',
                        notification.is_read
                          ? 'text-muted-foreground'
                          : 'font-medium text-foreground'
                      )}
                    >
                      {notification.title}
                    </p>
                    {notification.message && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatRelativeTime(new Date(notification.created_at))}
                    </p>
                  </div>

                  {/* Mark as read button */}
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

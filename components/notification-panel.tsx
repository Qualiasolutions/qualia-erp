'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, CheckCheck, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  useNotifications,
  useUnreadNotificationCount,
  useCurrentWorkspaceId,
  invalidateNotifications,
} from '@/lib/swr';
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '@/app/actions';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean | null;
  created_at: string | null;
  link: string | null;
}

export function NotificationPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { workspaceId } = useCurrentWorkspaceId();
  const { notifications, isLoading } = useNotifications(workspaceId || null);
  const { count: unreadCount } = useUnreadNotificationCount(workspaceId || null);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!workspaceId) return;
    startTransition(async () => {
      await markNotificationAsRead(notificationId);
      invalidateNotifications(workspaceId);
    });
  };

  const handleMarkAllAsRead = async () => {
    if (!workspaceId) return;
    startTransition(async () => {
      await markAllNotificationsAsRead(workspaceId);
      invalidateNotifications(workspaceId);
    });
  };

  const handleDelete = async (notificationId: string) => {
    if (!workspaceId) return;
    startTransition(async () => {
      await deleteNotification(notificationId);
      invalidateNotifications(workspaceId);
    });
  };

  const handleClick = (notification: NotificationItem) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      setOpen(false);
      router.push(notification.link);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="group relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:scale-105 hover:bg-primary/10 hover:text-primary dark:hover:text-primary"
          title="Notifications"
        >
          <Bell className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-medium text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={handleMarkAllAsRead}
              disabled={isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex h-full items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-muted p-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm font-medium">No notifications</p>
              <p className="mt-1 text-xs text-muted-foreground">You&apos;re all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((notification: NotificationItem) => (
                <div
                  key={notification.id}
                  className={cn(
                    'group relative flex cursor-pointer gap-3 px-4 py-3 transition-colors hover:bg-muted/50',
                    !notification.is_read && 'bg-primary/5'
                  )}
                  onClick={() => handleClick(notification)}
                >
                  {!notification.is_read && (
                    <span className="absolute left-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-sm',
                        !notification.is_read ? 'font-medium' : 'text-muted-foreground'
                      )}
                    >
                      {notification.title}
                    </p>
                    {notification.message && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                    )}
                    {notification.created_at && (
                      <p className="mt-1 text-[11px] text-muted-foreground/70">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        disabled={isPending}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notification.id);
                      }}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

'use client';

/**
 * Placeholder for the portal messages content component.
 * This will be fully implemented by the messages UI task.
 */
export function MessagesContent({
  userId,
  userName,
  userRole,
}: {
  userId: string;
  userName: string;
  userRole: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Messages</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Welcome, {userName}. Your messaging experience is loading.
      </p>
      <p className="mt-1 text-xs text-muted-foreground/60">
        User: {userId} | Role: {userRole}
      </p>
    </div>
  );
}

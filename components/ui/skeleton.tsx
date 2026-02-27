import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg bg-muted',
        'animate-shimmer bg-[length:200%_100%]',
        'via-muted-foreground/8 bg-gradient-to-r from-muted to-muted',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };

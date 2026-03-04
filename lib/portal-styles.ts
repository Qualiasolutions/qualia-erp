// Shared portal style utilities

export function getProjectStatusColor(status: string) {
  switch (status) {
    case 'Active':
      return 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20';
    case 'Launched':
      return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20';
    case 'Demos':
      return 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20';
    case 'Delayed':
      return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
    case 'Archived':
      return 'bg-muted text-muted-foreground border-border';
    case 'Canceled':
      return 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

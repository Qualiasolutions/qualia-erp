'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Settings,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  type LucideIcon,
} from 'lucide-react';
import type {
  IntegrationProvider,
  GitHubConfig,
  VercelConfig,
  ZohoConfig,
} from '@/lib/integrations/types';

interface IntegrationCardProps {
  provider: IntegrationProvider;
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  isConnected: boolean;
  lastVerified: string | null;
  config?: GitHubConfig | VercelConfig | ZohoConfig;
  onConnect: (token: string, config: GitHubConfig | VercelConfig | ZohoConfig) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onTest: () => Promise<{ valid: boolean; error?: string }>;
  onConfigureTemplates?: (templates: GitHubConfig['templates']) => Promise<void>;
}

export function IntegrationCard({
  provider,
  title,
  description,
  icon: Icon,
  iconColor,
  isConnected,
  lastVerified,
  config,
  onConnect,
  onDisconnect,
  onTest,
  onConfigureTemplates,
}: IntegrationCardProps) {
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [showToken, setShowToken] = useState(false);

  // Form state
  const [token, setToken] = useState('');
  const [org, setOrg] = useState((config as GitHubConfig)?.org || '');
  const [teamId, setTeamId] = useState((config as VercelConfig)?.teamId || '');

  // Template configuration
  const [templates, setTemplates] = useState<GitHubConfig['templates']>(
    (config as GitHubConfig)?.templates || {}
  );

  const handleConnect = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      let newConfig: GitHubConfig | VercelConfig | ZohoConfig;

      if (provider === 'github') {
        newConfig = { org, templates } as GitHubConfig;
      } else if (provider === 'vercel') {
        newConfig = teamId ? { teamId } : ({} as VercelConfig);
      } else {
        newConfig = {} as ZohoConfig;
      }

      await onConnect(token, newConfig);
      setIsConnectDialogOpen(false);
      setToken('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await onDisconnect();
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await onTest();
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveTemplates = async () => {
    if (!onConfigureTemplates) return;
    setIsLoading(true);
    try {
      await onConfigureTemplates(templates);
      setIsConfigDialogOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const formatLastVerified = (date: string | null) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', iconColor)}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-foreground">{title}</h3>
                {isConnected ? (
                  <span className="flex items-center gap-1 text-xs text-green-500">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <XCircle className="h-3 w-3" />
                    Not connected
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
              {isConnected && lastVerified && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Last verified: {formatLastVerified(lastVerified)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTest}
                  disabled={isTesting}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-1.5 hidden sm:inline">Test</span>
                </Button>
                {provider === 'github' && onConfigureTemplates && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsConfigDialogOpen(true)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="ml-1.5 hidden sm:inline">Configure</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={isLoading}
                  className="text-destructive hover:text-destructive"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span className="ml-1.5 hidden sm:inline">Disconnect</span>
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConnectDialogOpen(true)}
                className="gap-1.5"
              >
                Connect
              </Button>
            )}
          </div>
        </div>

        {testResult && (
          <div
            className={cn(
              'mt-3 rounded-md px-3 py-2 text-sm',
              testResult.valid
                ? 'bg-green-500/10 text-green-500'
                : 'bg-destructive/10 text-destructive'
            )}
          >
            {testResult.valid ? 'Connection successful!' : testResult.error || 'Connection failed'}
          </div>
        )}
      </div>

      {/* Connect Dialog */}
      <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect {title}</DialogTitle>
            <DialogDescription>
              Enter your API token to connect {title} to Qualia.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="token">API Token</Label>
              <div className="relative">
                <Input
                  id="token"
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={
                    provider === 'github'
                      ? 'ghp_xxxxxxxxxxxx'
                      : provider === 'vercel'
                        ? 'xxxxxxxxxxxx'
                        : 'xxxxxxxxxxxx'
                  }
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {provider === 'github' && (
                  <>
                    Get your token from{' '}
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      GitHub Settings
                    </a>
                    . Scopes: repo, workflow
                  </>
                )}
                {provider === 'vercel' && (
                  <>
                    Get your token from{' '}
                    <a
                      href="https://vercel.com/account/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Vercel Settings
                    </a>
                  </>
                )}
              </p>
            </div>

            {provider === 'github' && (
              <div className="space-y-2">
                <Label htmlFor="org">Organization Name</Label>
                <Input
                  id="org"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  placeholder="your-org-name"
                />
                <p className="text-xs text-muted-foreground">
                  The GitHub organization where repos will be created
                </p>
              </div>
            )}

            {provider === 'vercel' && (
              <div className="space-y-2">
                <Label htmlFor="teamId">Team ID (Optional)</Label>
                <Input
                  id="teamId"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  placeholder="team_xxxxxxxxxxxx"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use your personal account
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsConnectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConnect}
              disabled={isLoading || !token || (provider === 'github' && !org)}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Configuration Dialog (GitHub only) */}
      {provider === 'github' && (
        <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Configure Templates</DialogTitle>
              <DialogDescription>
                Set template repositories for each project type.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {(['web_design', 'ai_agent', 'voice_agent'] as const).map((type) => (
                <div key={type} className="space-y-2">
                  <Label htmlFor={`template-${type}`} className="capitalize">
                    {type.replace('_', ' ')} Template
                  </Label>
                  <Input
                    id={`template-${type}`}
                    value={templates[type] || ''}
                    onChange={(e) => setTemplates({ ...templates, [type]: e.target.value })}
                    placeholder={`qualia-${type.replace('_', '-')}-template`}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Enter the repository name (without org). These templates must exist in your
                organization.
              </p>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsConfigDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTemplates} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { Github, Globe, Phone } from 'lucide-react';
import { IntegrationCard } from '@/components/settings/integration-card';
import { toast } from '@/components/ui/use-toast';
import {
  saveIntegrationToken,
  removeIntegration,
  testIntegration,
  updateGitHubTemplates,
} from '@/app/actions/integrations';
import type {
  IntegrationProvider,
  GitHubConfig,
  VercelConfig,
  VAPIConfig,
} from '@/lib/integrations/types';

interface Integration {
  provider: string;
  is_connected: boolean;
  last_verified_at: string | null;
  config: unknown;
}

interface IntegrationsClientProps {
  workspaceId: string;
  initialIntegrations: Integration[];
}

export function IntegrationsClient({ workspaceId, initialIntegrations }: IntegrationsClientProps) {
  const [integrations, setIntegrations] = useState<Integration[]>(initialIntegrations);

  const getIntegration = (provider: IntegrationProvider) => {
    return integrations.find((i) => i.provider === provider);
  };

  const handleConnect = useCallback(
    async (
      provider: IntegrationProvider,
      token: string,
      config: GitHubConfig | VercelConfig | VAPIConfig
    ) => {
      const result = await saveIntegrationToken(workspaceId, provider, token, config);

      if (result.success) {
        toast({ title: `${provider} connected successfully` });
        // Update local state
        setIntegrations((prev) => {
          const existing = prev.find((i) => i.provider === provider);
          if (existing) {
            return prev.map((i) =>
              i.provider === provider
                ? { ...i, is_connected: true, last_verified_at: new Date().toISOString(), config }
                : i
            );
          }
          return [
            ...prev,
            {
              provider,
              is_connected: true,
              last_verified_at: new Date().toISOString(),
              config,
            },
          ];
        });
      } else {
        toast({
          title: `Failed to connect ${provider}`,
          description: result.error,
          variant: 'destructive',
        });
      }
    },
    [workspaceId]
  );

  const handleDisconnect = useCallback(
    async (provider: IntegrationProvider) => {
      const result = await removeIntegration(workspaceId, provider);

      if (result.success) {
        toast({ title: `${provider} disconnected` });
        setIntegrations((prev) => prev.filter((i) => i.provider !== provider));
      } else {
        toast({
          title: `Failed to disconnect ${provider}`,
          description: result.error,
          variant: 'destructive',
        });
      }
    },
    [workspaceId]
  );

  const handleTest = useCallback(
    async (provider: IntegrationProvider) => {
      const result = await testIntegration(workspaceId, provider);

      if (result.success && result.data) {
        if (result.data.valid) {
          setIntegrations((prev) =>
            prev.map((i) =>
              i.provider === provider ? { ...i, last_verified_at: new Date().toISOString() } : i
            )
          );
        }
        return result.data;
      }

      return { valid: false, error: result.error || 'Test failed' };
    },
    [workspaceId]
  );

  const handleConfigureTemplates = useCallback(
    async (templates: GitHubConfig['templates']) => {
      const result = await updateGitHubTemplates(workspaceId, templates);

      if (result.success) {
        toast({ title: 'Templates updated successfully' });
        setIntegrations((prev) =>
          prev.map((i) =>
            i.provider === 'github'
              ? { ...i, config: { ...(i.config as GitHubConfig), templates } }
              : i
          )
        );
      } else {
        toast({
          title: 'Failed to update templates',
          description: result.error,
          variant: 'destructive',
        });
      }
    },
    [workspaceId]
  );

  const githubIntegration = getIntegration('github');
  const vercelIntegration = getIntegration('vercel');
  const vapiIntegration = getIntegration('vapi');

  return (
    <div className="space-y-4">
      <IntegrationCard
        provider="github"
        title="GitHub"
        description="Create repositories from templates when projects are created"
        icon={Github}
        iconColor="bg-gray-700"
        isConnected={githubIntegration?.is_connected || false}
        lastVerified={githubIntegration?.last_verified_at || null}
        config={githubIntegration?.config as GitHubConfig | undefined}
        onConnect={(token, config) => handleConnect('github', token, config)}
        onDisconnect={() => handleDisconnect('github')}
        onTest={() => handleTest('github')}
        onConfigureTemplates={handleConfigureTemplates}
      />

      <IntegrationCard
        provider="vercel"
        title="Vercel"
        description="Deploy projects automatically with GitHub integration"
        icon={Globe}
        iconColor="bg-black"
        isConnected={vercelIntegration?.is_connected || false}
        lastVerified={vercelIntegration?.last_verified_at || null}
        config={vercelIntegration?.config as VercelConfig | undefined}
        onConnect={(token, config) => handleConnect('vercel', token, config)}
        onDisconnect={() => handleDisconnect('vercel')}
        onTest={() => handleTest('vercel')}
      />

      <IntegrationCard
        provider="vapi"
        title="VAPI"
        description="Create voice assistants for Voice Agent projects"
        icon={Phone}
        iconColor="bg-pink-600"
        isConnected={vapiIntegration?.is_connected || false}
        lastVerified={vapiIntegration?.last_verified_at || null}
        config={vapiIntegration?.config as VAPIConfig | undefined}
        onConnect={(token, config) => handleConnect('vapi', token, config)}
        onDisconnect={() => handleDisconnect('vapi')}
        onTest={() => handleTest('vapi')}
      />
    </div>
  );
}

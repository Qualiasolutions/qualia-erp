'use client';

import { useEffect, useState, useTransition } from 'react';
import { Copy, Key, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mintApiToken, revokeApiToken, listAllApiTokens } from '@/app/actions/api-tokens';

const SCOPE_OPTIONS = [
  { value: 'reports:write', label: 'reports:write', desc: 'Framework /qualia-report ingest' },
  { value: 'reports:read', label: 'reports:read', desc: 'Read framework reports' },
  { value: 'mcp:read', label: 'mcp:read', desc: 'MCP read tools (list_*, get_*)' },
  { value: 'mcp:write', label: 'mcp:write', desc: 'MCP mutation tools (create_*, update_*)' },
] as const;

type Profiles = { id: string; full_name: string | null; email: string | null };

type TokenRow = {
  id: string;
  name: string;
  token_prefix: string;
  scope: string;
  expires_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
  created_at: string;
  profile_id: string;
  profile: Profiles | Profiles[] | null;
};

export function ApiTokensPanel({ profiles }: { profiles: Profiles[] }) {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMint, setShowMint] = useState(false);
  const [mintedPlaintext, setMintedPlaintext] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function refresh() {
    setLoading(true);
    const res = await listAllApiTokens();
    if (res.success) {
      setTokens((res.data as TokenRow[]) ?? []);
    } else {
      toast.error(res.error ?? 'Failed to load tokens');
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  function copyToClipboard(value: string) {
    navigator.clipboard.writeText(value).then(
      () => toast.success('Copied to clipboard'),
      () => toast.error('Copy failed')
    );
  }

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this token? Any client using it will stop working immediately.')) return;
    startTransition(async () => {
      const res = await revokeApiToken(id);
      if (res.success) {
        toast.success('Token revoked');
        refresh();
      } else {
        toast.error(res.error ?? 'Revoke failed');
      }
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Key className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-semibold tracking-tight">API tokens</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Per-user bearer tokens for the framework, MCP server, and other integrations.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowMint((s) => !s);
            setMintedPlaintext(null);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          {showMint ? 'Cancel' : 'New token'}
        </Button>
      </div>

      {showMint && !mintedPlaintext && (
        <MintForm
          profiles={profiles}
          onMinted={(plaintext) => {
            setMintedPlaintext(plaintext);
            refresh();
          }}
        />
      )}

      {mintedPlaintext && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                Save this token now — it won&apos;t be shown again.
              </p>
              <code className="mt-2 block break-all rounded bg-background/80 p-2 text-xs">
                {mintedPlaintext}
              </code>
            </div>
            <div className="flex flex-col gap-1">
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(mintedPlaintext)}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMintedPlaintext(null);
                  setShowMint(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        {loading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
        ) : tokens.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No tokens yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Owner</th>
                <th className="pb-2 pr-4 font-medium">Scope</th>
                <th className="pb-2 pr-4 font-medium">Prefix</th>
                <th className="pb-2 pr-4 font-medium">Expires</th>
                <th className="pb-2 pr-4 font-medium">Last used</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => {
                const profile = Array.isArray(t.profile) ? t.profile[0] : t.profile;
                const isRevoked = !!t.revoked_at;
                const isExpired = new Date(t.expires_at) < new Date();
                return (
                  <tr
                    key={t.id}
                    className={`border-b border-border/50 ${
                      isRevoked || isExpired ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="py-2 pr-4 font-medium">{t.name}</td>
                    <td className="py-2 pr-4 text-xs">
                      {profile?.full_name ?? profile?.email ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-xs">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{t.scope}</code>
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">{t.token_prefix}…</td>
                    <td className="py-2 pr-4 text-xs">
                      {new Date(t.expires_at).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-4 text-xs">
                      {t.last_used_at ? new Date(t.last_used_at).toLocaleDateString() : 'never'}
                    </td>
                    <td className="py-2 text-right">
                      {isRevoked ? (
                        <span className="text-[11px] text-muted-foreground">revoked</span>
                      ) : isExpired ? (
                        <span className="text-[11px] text-muted-foreground">expired</span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleRevoke(t.id)}
                          aria-label="Revoke token"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end">
        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>
    </section>
  );
}

function MintForm({
  profiles,
  onMinted,
}: {
  profiles: Profiles[];
  onMinted: (plaintext: string) => void;
}) {
  const [name, setName] = useState('');
  const [profileId, setProfileId] = useState<string>(profiles[0]?.id ?? '');
  const [scopes, setScopes] = useState<Set<string>>(new Set(['reports:write']));
  const [expiresInDays, setExpiresInDays] = useState(90);
  const [submitting, setSubmitting] = useState(false);

  function toggleScope(value: string, checked: boolean) {
    setScopes((prev) => {
      const next = new Set(prev);
      if (checked) next.add(value);
      else next.delete(value);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !profileId || scopes.size === 0) {
      toast.error('Name, owner, and at least one scope are required');
      return;
    }
    setSubmitting(true);
    const res = await mintApiToken({
      profileId,
      name: name.trim(),
      scope: Array.from(scopes).join(' '),
      expiresInDays,
    });
    setSubmitting(false);
    if (res.success && res.data && typeof res.data === 'object' && 'plaintext' in res.data) {
      onMinted((res.data as { plaintext: string }).plaintext);
      toast.success('Token created');
    } else {
      toast.error(res.error ?? 'Mint failed');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-lg border border-border p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="token-name" className="text-xs">
            Name
          </Label>
          <Input
            id="token-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Fawzi · Claude connector"
            maxLength={120}
            required
          />
        </div>
        <div>
          <Label htmlFor="token-owner" className="text-xs">
            Owner
          </Label>
          <Select value={profileId} onValueChange={setProfileId}>
            <SelectTrigger id="token-owner">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name ?? p.email ?? p.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Scopes</Label>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SCOPE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-start gap-2 rounded border border-border p-2 text-sm hover:border-primary/50"
            >
              <Checkbox
                checked={scopes.has(opt.value)}
                onCheckedChange={(c) => toggleScope(opt.value, !!c)}
                className="mt-0.5"
              />
              <span>
                <code className="text-xs font-medium">{opt.label}</code>
                <span className="block text-[11px] text-muted-foreground">{opt.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="token-expires" className="text-xs">
          Expires in (days)
        </Label>
        <Input
          id="token-expires"
          type="number"
          min={1}
          max={365}
          value={expiresInDays}
          onChange={(e) => setExpiresInDays(Number(e.target.value))}
          className="w-32"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create token'}
        </Button>
      </div>
    </form>
  );
}

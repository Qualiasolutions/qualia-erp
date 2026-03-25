'use client';

import { useEffect, useState, useCallback } from 'react';
import { Shield, ShieldCheck, User, UserPlus, Crown, X, Menu } from 'lucide-react';
import { useSidebar } from '@/components/sidebar-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getTeamMembers,
  updateUserRole,
  inviteTeamMember,
  removeTeamMember,
  type AdminProfile,
} from '@/app/actions/admin';
import type { Database } from '@/types/database';

type UserRole = Database['public']['Enums']['user_role'];

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  admin: {
    label: 'Owner',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    icon: Crown,
  },
  manager: {
    label: 'Manager',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    icon: ShieldCheck,
  },
  employee: {
    label: 'Employee',
    color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
    icon: User,
  },
};

function RoleBadge({ role }: { role: string | null }) {
  const config = ROLE_CONFIG[role || 'employee'] || ROLE_CONFIG.employee;
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function InviteDialog({
  open,
  onClose,
  onInvite,
}: {
  open: boolean;
  onClose: () => void;
  onInvite: (email: string, name: string, role: UserRole, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onInvite(email, name, role, password);
    setLoading(false);
    setEmail('');
    setName('');
    setRole('employee');
    setPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Invite Team Member</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="name@qualiasolutions.net"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Temporary Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Min 8 characters"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">Role</label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Owner / Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Inviting...' : 'Invite'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { toggleMobile } = useSidebar();
  const [members, setMembers] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    const result = await getTeamMembers();
    if (result.success) {
      setMembers(Array.isArray(result.data) ? (result.data as AdminProfile[]) : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setActionError(null);
    const result = await updateUserRole(userId, newRole);
    if (result.success) {
      fetchMembers();
    } else {
      setActionError(result.error || 'Failed to update role');
    }
  };

  const handleInvite = async (email: string, name: string, role: UserRole, password: string) => {
    setActionError(null);
    const result = await inviteTeamMember(email, name, role, password);
    if (result.success) {
      fetchMembers();
    } else {
      setActionError(result.error || 'Failed to invite member');
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from the team? They will no longer be able to log in.`)) return;
    setActionError(null);
    const result = await removeTeamMember(userId);
    if (result.success) {
      fetchMembers();
    } else {
      setActionError(result.error || 'Failed to remove member');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Mobile-only top bar */}
      <header className="flex items-center gap-2 border-b border-border bg-card/80 px-6 py-4 backdrop-blur-xl sm:px-8 md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px]"
          onClick={toggleMobile}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10">
          <Shield className="h-3.5 w-3.5 text-amber-500" />
        </div>
        <h1 className="text-sm font-semibold text-foreground">Admin</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage roles and permissions for your team
            </p>
          </div>
          <Button onClick={() => setShowInvite(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invite Member
          </Button>
        </div>

        {/* Role legend */}
        <div className="mb-6 flex flex-wrap gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <RoleBadge role="admin" />
            <span className="text-muted-foreground">Full access, manage roles</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <RoleBadge role="manager" />
            <span className="text-muted-foreground">View admin, manage team</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <RoleBadge role="employee" />
            <span className="text-muted-foreground">Standard access</span>
          </div>
        </div>

        {/* Error */}
        {actionError && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {actionError}
          </div>
        )}

        {/* Team table */}
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[250px]">Member</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[150px]">Role</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-xs font-semibold text-primary">
                          {(member.full_name || member.email || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium">{member.full_name || 'No name'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>
                  <TableCell>
                    <Select
                      value={member.role || 'employee'}
                      onValueChange={(v) => handleRoleChange(member.id, v as UserRole)}
                    >
                      <SelectTrigger className="h-8 w-[130px] border-none bg-transparent px-0 shadow-none focus:ring-0">
                        <RoleBadge role={member.role} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Owner / Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        handleRemove(member.id, member.full_name || member.email || '')
                      }
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <InviteDialog
          open={showInvite}
          onClose={() => setShowInvite(false)}
          onInvite={handleInvite}
        />
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { updateClientProfile } from '@/app/actions/client-portal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PortalAccountFormProps {
  initialName: string;
  email: string;
}

export function PortalAccountForm({ initialName, email }: PortalAccountFormProps) {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await updateClientProfile({ full_name: name });
    setLoading(false);

    if (result.success) {
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update profile' });
    }
  };

  const hasChanges = name !== initialName;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Display Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
          <Input value={email} disabled className="bg-muted" />
        </div>
      </div>

      {message && (
        <p
          className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-destructive'}`}
        >
          {message.text}
        </p>
      )}

      <Button type="submit" disabled={loading || !hasChanges}>
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}

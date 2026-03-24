'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateClientRecord } from '@/app/actions';
import { Loader2 } from 'lucide-react';

type LeadStatus = 'dropped' | 'cold' | 'hot' | 'active_client' | 'inactive_client' | 'dead_lead';

const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: 'cold', label: 'Cold' },
  { value: 'hot', label: 'Hot' },
  { value: 'active_client', label: 'Active Client' },
  { value: 'inactive_client', label: 'Inactive Client' },
  { value: 'dropped', label: 'Dropped' },
  { value: 'dead_lead', label: 'Dead Lead' },
];

interface EditableClient {
  id: string;
  display_name: string | null;
  phone: string | null;
  website: string | null;
  billing_address: string | null;
  lead_status: string | null;
  notes: string | null;
}

interface EditClientModalProps {
  client: EditableClient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditClientModal({ client, open, onOpenChange }: EditClientModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState(client.display_name || '');
  const [phone, setPhone] = useState(client.phone || '');
  const [website, setWebsite] = useState(client.website || '');
  const [billingAddress, setBillingAddress] = useState(client.billing_address || '');
  const [leadStatus, setLeadStatus] = useState<LeadStatus>(
    (client.lead_status as LeadStatus) || 'cold'
  );
  const [notes, setNotes] = useState(client.notes || '');

  // Reset form when client changes or modal opens
  useEffect(() => {
    if (open) {
      setDisplayName(client.display_name || '');
      setPhone(client.phone || '');
      setWebsite(client.website || '');
      setBillingAddress(client.billing_address || '');
      setLeadStatus((client.lead_status as LeadStatus) || 'cold');
      setNotes(client.notes || '');
      setError(null);
    }
  }, [client, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set('id', client.id);
    formData.set('display_name', displayName);
    formData.set('phone', phone);
    formData.set('website', website);
    formData.set('billing_address', billingAddress);
    formData.set('lead_status', leadStatus);
    formData.set('notes', notes);

    const result = await updateClientRecord(formData);

    setLoading(false);

    if (result.success) {
      onOpenChange(false);
      router.refresh();
    } else {
      setError(result.error || 'Failed to update client');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Client Name *</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter client name"
              required
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          {/* Billing Address */}
          <div className="space-y-2">
            <Label htmlFor="billingAddress">Address</Label>
            <Input
              id="billingAddress"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="123 Main St, City, State"
            />
          </div>

          {/* Lead Status */}
          <div className="space-y-2">
            <Label htmlFor="leadStatus">Status</Label>
            <Select value={leadStatus} onValueChange={(v) => setLeadStatus(v as LeadStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this client..."
              rows={3}
            />
          </div>

          {/* Error */}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !displayName.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

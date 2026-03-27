'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  usePlannedLogoutTime,
  useCurrentWorkspaceId,
  invalidatePlannedLogoutTime,
} from '@/lib/swr';
import { updatePlannedLogoutTime } from '@/app/actions/work-sessions';

/**
 * Converts a stored TIME value (e.g. "16:00:00") to HH:MM for an <input type="time">.
 */
function toInputValue(timeStr: string | null): string {
  if (!timeStr) return '';
  // Take only HH:MM
  return timeStr.slice(0, 5);
}

export function WorkScheduleSection() {
  const { workspaceId } = useCurrentWorkspaceId();
  const { plannedLogoutTime, isLoading } = usePlannedLogoutTime(workspaceId ?? null);

  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync input from loaded data
  useEffect(() => {
    if (!isLoading) {
      setInputValue(toInputValue(plannedLogoutTime));
    }
  }, [plannedLogoutTime, isLoading]);

  async function handleSave() {
    if (!workspaceId) return;
    setSaving(true);
    try {
      const result = await updatePlannedLogoutTime(workspaceId, inputValue || null);
      if (result.success) {
        invalidatePlannedLogoutTime(workspaceId, true);
        toast.success('Work schedule saved');
      } else {
        toast.error(result.error ?? 'Failed to save');
      }
    } catch {
      toast.error('Failed to save work schedule');
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    if (!workspaceId) return;
    setSaving(true);
    try {
      const result = await updatePlannedLogoutTime(workspaceId, null);
      if (result.success) {
        setInputValue('');
        invalidatePlannedLogoutTime(workspaceId, true);
        toast.success('Work schedule cleared');
      } else {
        toast.error(result.error ?? 'Failed to clear');
      }
    } catch {
      toast.error('Failed to clear work schedule');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Clock className="h-4 w-4 text-primary" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Planned end-of-shift time</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Set your planned clock-out time. You&apos;ll see a reminder banner if you&apos;re still
            clocked in after this time.
          </p>
        </div>
      </div>

      <div className="space-y-3 pl-12">
        <div className="space-y-1.5">
          <Label htmlFor="planned-logout-time" className="text-xs text-muted-foreground">
            End of shift
          </Label>
          <Input
            id="planned-logout-time"
            type="time"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading || saving}
            className="w-40"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving || isLoading}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          {(inputValue || plannedLogoutTime) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              disabled={saving || isLoading}
              className="text-muted-foreground"
            >
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

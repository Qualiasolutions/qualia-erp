'use client';

import { useState } from 'react';
import { createManualInvoice } from '@/app/actions/financials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Loader2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ClientOption {
  id: string;
  name: string;
}

interface PortalInvoiceFormDialogProps {
  clients: ClientOption[];
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'void', label: 'Void' },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

export function PortalInvoiceFormDialog({ clients }: PortalInvoiceFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [total, setTotal] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [status, setStatus] = useState('sent');
  const [date, setDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const reset = () => {
    setInvoiceNumber('');
    setTotal('');
    setCurrency('EUR');
    setStatus('sent');
    setDate(todayISO());
    setDueDate('');
    setClientId('');
    setPdfFile(null);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setTimeout(reset, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim() || !total || !clientId) return;

    const customerName = clients.find((c) => c.id === clientId)?.name ?? '';
    if (!customerName) {
      toast.error('Pick a client');
      return;
    }

    setLoading(true);
    const result = await createManualInvoice(
      {
        invoice_number: invoiceNumber.trim(),
        total: Number(total),
        currency_code: currency.toUpperCase(),
        status: status as 'draft' | 'sent' | 'overdue' | 'paid' | 'void',
        date,
        due_date: dueDate || null,
        client_id: clientId,
        customer_name: customerName,
      },
      pdfFile
    );
    setLoading(false);

    if (result.success) {
      toast.success('Invoice created');
      handleOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to create invoice');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="default" className="h-11 cursor-pointer gap-2 rounded-xl px-5">
          <Plus className="h-4 w-4" />
          New invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">New invoice</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Create an invoice for a client. PDF is optional — clients see the download link if
            attached.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="invoice-number" className="text-sm font-medium">
                Invoice number
              </Label>
              <Input
                id="invoice-number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-2026-001"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invoice-status" className="text-sm font-medium">
                Status
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="invoice-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="invoice-total" className="text-sm font-medium">
                Amount
              </Label>
              <Input
                id="invoice-total"
                type="number"
                step="0.01"
                min="0"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invoice-currency" className="text-sm font-medium">
                Currency
              </Label>
              <Input
                id="invoice-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
                placeholder="EUR"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="invoice-date" className="text-sm font-medium">
                Issue date
              </Label>
              <Input
                id="invoice-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invoice-due-date" className="text-sm font-medium">
                Due date (optional)
              </Label>
              <Input
                id="invoice-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invoice-client" className="text-sm font-medium">
              Client
            </Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="invoice-client">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invoice-pdf" className="text-sm font-medium">
              PDF (optional, max 10 MB)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="invoice-pdf"
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                className="cursor-pointer"
              />
              {pdfFile && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Upload className="h-3 w-3" aria-hidden="true" />
                  {pdfFile.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer rounded-lg"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !invoiceNumber.trim() || !total || !clientId}
              className="cursor-pointer rounded-lg bg-primary text-primary-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create invoice'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

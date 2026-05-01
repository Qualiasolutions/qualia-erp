'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { ExternalLink, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatEUR } from '@/lib/currency';
import {
  INVOICE_TEMPLATES,
  TERMS_TEMPLATES,
  ZOHO_VAT_19_TAX_ID,
  resolvePlaceholders,
  type InvoiceTemplate,
  type TemplateLineItem,
  type TermsTemplateKey,
} from '@/lib/invoice-templates';
import {
  generateInvoiceCoverEmail,
  generateInvoiceFromTemplate,
  type BillableClient,
} from '@/app/actions/invoice-generation';

type LineItemDraft = {
  item_id?: string;
  name: string;
  description: string;
  rate: number;
  vat: boolean;
};

function lineFromTemplate(l: TemplateLineItem): LineItemDraft {
  return {
    item_id: l.item_id,
    name: l.name,
    description: l.description,
    rate: l.default_rate,
    vat: l.vat,
  };
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysFromNow(d: number): string {
  return new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
}

function previewPlaceholders(invoiceDate: string, referenceNumber: string) {
  const date = new Date(invoiceDate);
  return {
    month: MONTH_NAMES[date.getMonth()] ?? '',
    year: String(date.getFullYear()),
    invoice_date: invoiceDate,
    reference_number: referenceNumber,
    invoice_number: '(auto)',
  };
}

export function FinanceTemplateInvoiceDialog({
  clients,
  trigger,
}: {
  clients: BillableClient[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} className="inline-block">
          {trigger}
        </span>
      ) : (
        <Button onClick={() => setOpen(true)} size="sm" className="h-8 gap-1.5 rounded-lg">
          <Sparkles className="h-3.5 w-3.5" />
          New invoice from template
        </Button>
      )}
      <DialogBody open={open} onOpenChange={setOpen} clients={clients} />
    </>
  );
}

function DialogBody({
  open,
  onOpenChange,
  clients,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clients: BillableClient[];
}) {
  const [templateKey, setTemplateKey] = useState<string>('monthly_retainer');
  const [clientId, setClientId] = useState<string>('');
  const [lines, setLines] = useState<LineItemDraft[]>([]);
  const [invoiceDate, setInvoiceDate] = useState<string>(todayISO());
  const [dueDate, setDueDate] = useState<string>(daysFromNow(30));
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [termsKey, setTermsKey] = useState<TermsTemplateKey>('generic');
  const [notes, setNotes] = useState<string>('');
  const [draftEmail, setDraftEmail] = useState<boolean>(true);
  const [emailTo, setEmailTo] = useState<string>('');
  const [emailCc, setEmailCc] = useState<string>('');

  const [isPending, startTransition] = useTransition();
  const [created, setCreated] = useState<{
    invoice_number: string;
    invoice_url?: string;
    total: number;
  } | null>(null);

  const template: InvoiceTemplate | undefined = INVOICE_TEMPLATES[templateKey];
  const client = clients.find((c) => c.id === clientId);

  // Reset / sync when template or open changes
  useEffect(() => {
    if (!open) return;
    if (!template) return;
    setLines(template.line_items.map(lineFromTemplate));
    setDueDate(daysFromNow(template.default_due_days));
  }, [open, template, templateKey]);

  // When client changes, default emailTo if blank (we don't have client emails in DB yet,
  // so leave for the user to type — Zoho will infer from contact_id anyway).
  useEffect(() => {
    if (client && !emailTo) {
      // no-op for now — we don't store contact email on the clients table
    }
  }, [client, emailTo]);

  const placeholders = useMemo(
    () => previewPlaceholders(invoiceDate, referenceNumber),
    [invoiceDate, referenceNumber]
  );

  const subtotal = lines.reduce((sum, l) => sum + (Number.isFinite(l.rate) ? l.rate : 0), 0);
  const vatable = lines
    .filter((l) => l.vat && (client?.default_vat_treatment ?? 'cyprus_vat') === 'cyprus_vat')
    .reduce((s, l) => s + l.rate, 0);
  const vat = vatable * 0.19;
  const total = subtotal + vat;

  function handleAddLine() {
    setLines((prev) => [...prev, { name: 'New line', description: '', rate: 0, vat: true }]);
  }

  function handleUpdateLine(idx: number, patch: Partial<LineItemDraft>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function handleRemoveLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleClose() {
    onOpenChange(false);
    // Reset for next time
    setTimeout(() => {
      setCreated(null);
      setClientId('');
      setLines([]);
      setReferenceNumber('');
      setEmailTo('');
      setEmailCc('');
      setNotes('');
      setInvoiceDate(todayISO());
    }, 200);
  }

  function handleSubmit() {
    if (!template) {
      toast.error('Pick a template first');
      return;
    }
    if (!clientId) {
      toast.error('Pick a client');
      return;
    }
    if (template.requires_reference && !referenceNumber.trim()) {
      toast.error(`This template needs a reference number (e.g. proposal QS-2026-…)`);
      return;
    }

    startTransition(async () => {
      const r = await generateInvoiceFromTemplate({
        template_key: template.key,
        client_id: clientId,
        line_items: lines.map((l) => ({
          item_id: l.item_id,
          name: l.name,
          description: l.description,
          rate: l.rate,
          quantity: 1,
          vat: l.vat,
        })),
        invoice_date: invoiceDate,
        due_date: dueDate,
        reference_number: referenceNumber.trim() || undefined,
        terms_key: termsKey,
        notes: notes.trim() || undefined,
      });

      if (!r.success) {
        toast.error(r.error);
        return;
      }

      setCreated({
        invoice_number: r.data.invoice_number,
        invoice_url: r.data.invoice_url,
        total: r.data.total,
      });
      toast.success(`Draft ${r.data.invoice_number} created in Zoho`);

      // Optionally also draft the cover email
      if (draftEmail && emailTo.trim()) {
        const ccList = emailCc
          .split(/[,;\s]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        const emailResult = await generateInvoiceCoverEmail({
          template_key: template.key,
          client_id: clientId,
          invoice_number: r.data.invoice_number,
          invoice_date: invoiceDate,
          reference_number: referenceNumber.trim() || undefined,
          to: emailTo.trim(),
          cc: ccList,
        });
        if (emailResult.success) {
          toast.success('Cover email saved to Zoho Mail Drafts');
        } else {
          toast.warning(`Invoice created but email draft failed: ${emailResult.error}`);
        }
      }
    });
  }

  // Resolved subject preview
  const subjectPreview = template ? resolvePlaceholders(template.email_subject, placeholders) : '';

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : handleClose())}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            New invoice from template
          </DialogTitle>
          <DialogDescription>
            Pushes a draft to Zoho Books. Optionally drafts a cover email in Zoho Mail.
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <SuccessBlock created={created} onClose={handleClose} />
        ) : (
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-template">Template</Label>
                <Select
                  value={templateKey}
                  onValueChange={(v) => setTemplateKey(v)}
                  disabled={isPending}
                >
                  <SelectTrigger id="tpl-template">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(INVOICE_TEMPLATES).map((t) => (
                      <SelectItem key={t.key} value={t.key}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {template ? (
                  <p className="text-[11px] text-muted-foreground">{template.description}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tpl-client">Client</Label>
                <Select value={clientId} onValueChange={setClientId} disabled={isPending}>
                  <SelectTrigger id="tpl-client">
                    <SelectValue placeholder="Pick a billable client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.length === 0 ? (
                      <SelectItem value="" disabled>
                        No clients linked to Zoho yet
                      </SelectItem>
                    ) : (
                      clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.display_name}
                          {c.default_vat_treatment === 'non_eu_zero' ? ' · no VAT' : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {client ? (
                  <p className="text-[11px] text-muted-foreground">
                    Zoho: {client.zoho_company_name ?? client.zoho_contact_id}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-date">Invoice date</Label>
                <Input
                  id="tpl-date"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-due">Due date</Label>
                <Input
                  id="tpl-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-terms">Terms</Label>
                <Select
                  value={termsKey}
                  onValueChange={(v) => setTermsKey(v as TermsTemplateKey)}
                  disabled={isPending}
                >
                  <SelectTrigger id="tpl-terms">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(TERMS_TEMPLATES).map((k) => (
                      <SelectItem key={k} value={k}>
                        {k === 'generic' ? 'Generic Qualia terms' : 'Sakani PDA terms'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {template?.requires_reference ? (
              <div className="space-y-1.5">
                <Label htmlFor="tpl-ref">Reference number (proposal)</Label>
                <Input
                  id="tpl-ref"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. QS-2026-EVMSTR"
                  disabled={isPending}
                />
              </div>
            ) : null}

            {/* Line items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line items</Label>
                {template?.allow_extra_lines !== false ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={handleAddLine}
                    disabled={isPending}
                  >
                    <Plus className="h-3 w-3" /> Add line
                  </Button>
                ) : null}
              </div>
              <ul className="space-y-2 rounded-lg border border-border bg-muted/30 p-2">
                {lines.length === 0 ? (
                  <li className="px-2 py-3 text-center text-xs text-muted-foreground">
                    Pick a template to load default lines
                  </li>
                ) : (
                  lines.map((l, idx) => (
                    <li key={idx} className="rounded-md bg-background p-2">
                      <div
                        className="grid items-start gap-2"
                        style={{ gridTemplateColumns: '1fr 100px 70px 30px' }}
                      >
                        <div className="space-y-1">
                          <Input
                            value={resolvePlaceholders(l.name, placeholders)}
                            onChange={(e) => handleUpdateLine(idx, { name: e.target.value })}
                            disabled={isPending}
                            className="h-8 text-xs font-medium"
                          />
                          <Textarea
                            value={resolvePlaceholders(l.description, placeholders)}
                            onChange={(e) => handleUpdateLine(idx, { description: e.target.value })}
                            disabled={isPending}
                            rows={2}
                            className="text-[10px]"
                          />
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={l.rate}
                          onChange={(e) =>
                            handleUpdateLine(idx, { rate: Number(e.target.value) || 0 })
                          }
                          disabled={isPending}
                          className="h-8 text-right font-mono text-xs tabular-nums"
                          aria-label="Rate"
                        />
                        <label className="flex items-center justify-center gap-1 pt-1.5 text-[10px] text-muted-foreground">
                          <Checkbox
                            checked={l.vat}
                            onCheckedChange={(checked) =>
                              handleUpdateLine(idx, { vat: checked === true })
                            }
                            disabled={isPending}
                          />
                          VAT
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 self-start text-red-500 hover:bg-red-500/10 hover:text-red-500"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={isPending || template?.allow_extra_lines === false}
                          aria-label="Remove line"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
              <div className="flex items-baseline justify-end gap-4 px-2 font-mono text-xs tabular-nums text-muted-foreground">
                <span>
                  Subtotal <span className="text-foreground">{formatEUR(subtotal)}</span>
                </span>
                <span>
                  VAT <span className="text-foreground">{formatEUR(vat)}</span>
                </span>
                <span className="text-sm font-semibold text-foreground">
                  Total {formatEUR(total)}
                </span>
              </div>
              {client?.default_vat_treatment !== 'cyprus_vat' && client ? (
                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                  Client tax treatment is{' '}
                  <code>{client.default_vat_treatment ?? 'unspecified'}</code> — VAT will be zeroed
                  regardless of line settings.
                </p>
              ) : null}
              <p className="text-[10px] text-muted-foreground">
                Tax ID applied when VAT enabled: <code>{ZOHO_VAT_19_TAX_ID}</code>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-notes">Notes (footer)</Label>
              <Textarea
                id="tpl-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional — overrides the template default"
                rows={2}
                disabled={isPending}
              />
            </div>

            {/* Email draft block */}
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <label className="flex items-center gap-2 text-xs font-medium">
                <Checkbox
                  checked={draftEmail}
                  onCheckedChange={(c) => setDraftEmail(c === true)}
                  disabled={isPending}
                />
                Also draft cover email in Zoho Mail
              </label>
              {draftEmail ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="tpl-email-to" className="text-[11px]">
                        To
                      </Label>
                      <Input
                        id="tpl-email-to"
                        type="email"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                        placeholder="client@example.com"
                        disabled={isPending}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="tpl-email-cc" className="text-[11px]">
                        CC (comma separated)
                      </Label>
                      <Input
                        id="tpl-email-cc"
                        value={emailCc}
                        onChange={(e) => setEmailCc(e.target.value)}
                        placeholder="optional"
                        disabled={isPending}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Subject preview: <span className="font-mono">{subjectPreview}</span>
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {!created && (
          <DialogFooter>
            <Button variant="ghost" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !clientId}>
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Creating draft…
                </>
              ) : (
                'Create draft in Zoho'
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SuccessBlock({
  created,
  onClose,
}: {
  created: { invoice_number: string; invoice_url?: string; total: number };
  onClose: () => void;
}) {
  return (
    <div className="space-y-4 py-4">
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
        <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          Draft created in Zoho Books
        </div>
        <div className="mt-1 font-mono text-xs">
          {created.invoice_number} · {formatEUR(created.total)}
        </div>
        {created.invoice_url ? (
          <a
            href={created.invoice_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
          >
            View customer link <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
      <DialogFooter>
        <Button onClick={onClose}>Done</Button>
      </DialogFooter>
    </div>
  );
}

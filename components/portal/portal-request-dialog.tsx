'use client';

import { useRef, useState } from 'react';
import { createFeatureRequest, uploadRequestAttachment } from '@/app/actions/client-requests';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Plus,
  CheckCircle2,
  Loader2,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Wrench,
  Bug,
  HelpCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
}

interface PortalRequestDialogProps {
  projects: Project[];
}

const REQUEST_CATEGORIES = [
  {
    value: 'feature_request',
    label: 'Feature',
    description: 'Add something new',
    icon: Sparkles,
  },
  {
    value: 'full_stack_feature',
    label: 'Full stack',
    description: 'UI + backend',
    icon: Layers,
  },
  {
    value: 'change_request',
    label: 'Change',
    description: 'Tweak existing',
    icon: Wrench,
  },
  { value: 'bug_report', label: 'Bug', description: 'Something broken', icon: Bug },
  { value: 'question', label: 'Question', description: 'Just asking', icon: HelpCircle },
] as const;

const PRIORITIES = [
  {
    value: 'low',
    label: 'Low',
    hint: 'When you get to it',
    tone: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300',
    activeTone: 'border-slate-400 bg-slate-100 text-slate-900 dark:bg-slate-500/20 dark:text-white',
  },
  {
    value: 'medium',
    label: 'Medium',
    hint: 'Normal pace',
    tone: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
    activeTone:
      'border-amber-400 bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100',
  },
  {
    value: 'high',
    label: 'High',
    hint: 'Important to us',
    tone: 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300',
    activeTone:
      'border-orange-400 bg-orange-100 text-orange-900 dark:bg-orange-500/20 dark:text-orange-100',
  },
] as const;

const ACCEPTED_FILE_TYPES =
  '.pdf,.xlsx,.xls,.docx,.doc,.pptx,.csv,.txt,.jpg,.jpeg,.png,.gif,.webp,.svg,.zip';
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_FILES = 10;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string) {
  if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-muted-foreground" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

export function PortalRequestDialog({ projects }: PortalRequestDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]['value']>('medium');
  const [category, setCategory] =
    useState<(typeof REQUEST_CATEGORIES)[number]['value']>('feature_request');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setProjectId('');
    setPriority('medium');
    setCategory('feature_request');
    setFiles([]);
    setUploadStatus('');
    setSubmitted(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const valid: File[] = [];
    for (const f of selected) {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`"${f.name}" exceeds 20MB and was skipped`);
        continue;
      }
      valid.push(f);
    }
    const combined = [...files, ...valid].slice(0, MAX_FILES);
    if (files.length + valid.length > MAX_FILES) {
      toast.error(`Max ${MAX_FILES} attachments per request`);
    }
    setFiles(combined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setUploadStatus('Creating request…');

    const result = await createFeatureRequest({
      title: `[${REQUEST_CATEGORIES.find((c) => c.value === category)?.label}] ${title}`,
      description: description || undefined,
      project_id: projectId || undefined,
      priority,
    });

    if (!result.success || !result.data) {
      setLoading(false);
      setUploadStatus('');
      toast.error(result.error || 'Failed to submit request. Please try again.');
      return;
    }

    const requestId = (result.data as { id: string }).id;

    if (files.length > 0) {
      let uploaded = 0;
      for (const file of files) {
        uploaded += 1;
        setUploadStatus(`Uploading ${uploaded}/${files.length}: ${file.name}`);
        const fd = new FormData();
        fd.append('request_id', requestId);
        fd.append('file', file);
        const upRes = await uploadRequestAttachment(fd);
        if (!upRes.success) {
          toast.error(`Failed to upload "${file.name}": ${upRes.error}`);
        }
      }
    }

    setLoading(false);
    setUploadStatus('');
    setSubmitted(true);
    toast.success('Request submitted');
    router.refresh();
  };

  const handleOpenChange = (next: boolean) => {
    if (loading) return;
    setOpen(next);
    if (!next) {
      setTimeout(resetForm, 200);
    }
  };

  const activeCategory = REQUEST_CATEGORIES.find((c) => c.value === category);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="default" className="h-10 cursor-pointer gap-1.5 rounded-xl">
          <Plus className="h-4 w-4" />
          New request
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[560px]">
        {submitted ? (
          <div className="flex flex-col items-center px-8 py-12 text-center">
            <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15">
                <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
              Logged
            </div>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
              Request received
            </h3>
            <p className="mt-2 max-w-[360px] text-sm leading-relaxed text-muted-foreground">
              Your request is on the team’s board. We typically reply within the hour during working
              hours.
            </p>
            <Button
              variant="outline"
              className="mt-7 cursor-pointer rounded-xl"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : (
          <>
            {/* Header — eyebrow + display heading + accent rule */}
            <div className="border-b border-border bg-card/40 px-6 pb-5 pt-6">
              <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                <span className="inline-block h-px w-6 bg-primary/60" aria-hidden />
                <span>Open a thread</span>
              </div>
              <DialogHeader className="mt-2 space-y-1.5">
                <DialogTitle className="text-[22px] font-semibold leading-tight tracking-tight text-foreground">
                  New request
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  A feature, a bug, a question — drop the details and we’ll get back to you.
                </DialogDescription>
              </DialogHeader>
            </div>

            <form
              id="portal-request-form"
              onSubmit={handleSubmit}
              className="max-h-[70vh] overflow-y-auto px-6 py-5"
            >
              <div className="space-y-6">
                {/* Category chips */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      Type
                    </Label>
                    {activeCategory ? (
                      <span className="font-mono text-[10px] text-muted-foreground/70">
                        {activeCategory.description}
                      </span>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {REQUEST_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const active = category === cat.value;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setCategory(cat.value)}
                          aria-pressed={active}
                          className={cn(
                            'group relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all duration-150',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                            active
                              ? 'border-primary/40 bg-primary/[0.08] text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.15)_inset]'
                              : 'border-border bg-card hover:border-primary/25 hover:bg-card/80'
                          )}
                        >
                          <Icon
                            className={cn(
                              'h-4 w-4 transition-colors',
                              active ? 'text-primary' : 'text-muted-foreground'
                            )}
                          />
                          <span
                            className={cn(
                              'text-[11px] font-medium leading-tight',
                              active ? 'text-foreground' : 'text-muted-foreground'
                            )}
                          >
                            {cat.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="request-title" className="text-sm font-medium">
                    What’s on your mind?
                  </Label>
                  <Input
                    id="request-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="A short headline — e.g. ‘Add invoice export to CSV’"
                    className="h-11 rounded-xl text-[14px]"
                    required
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="request-description" className="text-sm font-medium">
                    Tell us more{' '}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    id="request-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What problem are you trying to solve? Any links, examples, or screenshots help us move faster."
                    rows={4}
                    className="resize-none rounded-xl text-[14px] leading-relaxed"
                  />
                </div>

                {/* Priority chips */}
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Priority
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRIORITIES.map((p) => {
                      const active = priority === p.value;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setPriority(p.value)}
                          aria-pressed={active}
                          className={cn(
                            'flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-colors duration-150',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                            active ? p.activeTone : p.tone,
                            !active && 'opacity-70 hover:opacity-100'
                          )}
                        >
                          <span className="text-[13px] font-semibold leading-tight">{p.label}</span>
                          <span className="mt-0.5 text-[10.5px] opacity-70">{p.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Project selector — collapsed when only zero/one option */}
                {projects.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="request-project" className="text-sm font-medium">
                      Project <span className="font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <Select value={projectId} onValueChange={setProjectId}>
                      <SelectTrigger id="request-project" className="h-11 rounded-xl text-[14px]">
                        <SelectValue placeholder="Choose a project to attach this to" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Attachments */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Attachments{' '}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_FILE_TYPES}
                    onChange={handleFileSelect}
                    className="hidden"
                    id="request-file-input"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 cursor-pointer gap-1.5 rounded-xl"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={files.length >= MAX_FILES}
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      Attach files
                    </Button>
                    <span className="text-[11px] text-muted-foreground">
                      PDF · DOCX · images · ZIP — up to 20MB each, max {MAX_FILES}.
                    </span>
                  </div>

                  {files.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {files.map((f, i) => (
                        <li
                          key={`${f.name}-${i}`}
                          className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            {fileIcon(f.type)}
                            <span className="truncate font-medium text-foreground">{f.name}</span>
                            <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                              {formatBytes(f.size)}
                            </span>
                          </div>
                          <button
                            type="button"
                            aria-label={`Remove ${f.name}`}
                            onClick={() => removeFile(i)}
                            className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-border bg-card/40 px-6 py-4">
              <p
                className="min-h-[16px] flex-1 truncate font-mono text-[11px] text-muted-foreground"
                aria-live="polite"
              >
                {uploadStatus || 'We typically reply within the hour.'}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="cursor-pointer rounded-xl"
                  onClick={() => handleOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="portal-request-form"
                  disabled={loading || !title.trim()}
                  className="cursor-pointer gap-1.5 rounded-xl bg-primary text-primary-foreground"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      Send request
                      <span aria-hidden>↵</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

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
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
}

interface PortalRequestDialogProps {
  projects: Project[];
}

const requestCategories = [
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'full_stack_feature', label: 'Full Stack Feature' },
  { value: 'change_request', label: 'Change Request' },
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'question', label: 'Question' },
];

// Keep aligned with server action's ALLOWED_ATTACHMENT_MIME set
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
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('feature_request');
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
      title: `[${requestCategories.find((c) => c.value === category)?.label}] ${title}`,
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

    // Upload attachments sequentially so errors bubble cleanly
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
    router.refresh();
  };

  const handleOpenChange = (next: boolean) => {
    if (loading) return;
    setOpen(next);
    if (!next) {
      setTimeout(resetForm, 200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="default" className="h-11 cursor-pointer gap-2 rounded-xl px-5">
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        {submitted ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10">
              <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Request Submitted</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We&apos;ll review your request and respond with updates.
            </p>
            <Button
              variant="outline"
              className="mt-6 cursor-pointer rounded-lg"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold tracking-tight">
                New Request
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Submit a feature request, bug report, or question.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="request-category" className="text-sm font-medium">
                    Category
                  </Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="request-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {requestCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="request-priority" className="text-sm font-medium">
                    Priority
                  </Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger id="request-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="request-title" className="text-sm font-medium">
                  Title
                </Label>
                <Input
                  id="request-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief description of your request"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="request-description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="request-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide more details..."
                  rows={4}
                />
              </div>

              {projects.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="request-project" className="text-sm font-medium">
                    Project (optional)
                  </Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger id="request-project">
                      <SelectValue placeholder="Select project" />
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

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Attachments (optional)</Label>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_FILE_TYPES}
                    onChange={handleFileSelect}
                    className="hidden"
                    id="request-file-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer gap-1.5 rounded-lg"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={files.length >= MAX_FILES}
                  >
                    <Paperclip className="h-4 w-4" />
                    Attach files
                  </Button>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    PDF, XLSX, DOCX, images, ZIP · up to 20MB each · max {MAX_FILES}
                  </p>
                </div>
                {files.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {files.map((f, i) => (
                      <li
                        key={`${f.name}-${i}`}
                        className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          {fileIcon(f.type)}
                          <span className="truncate">{f.name}</span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {formatBytes(f.size)}
                          </span>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${f.name}`}
                          onClick={() => removeFile(i)}
                          className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {uploadStatus && (
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  {uploadStatus}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer rounded-lg"
                  onClick={() => handleOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="cursor-pointer rounded-lg bg-primary text-primary-foreground"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

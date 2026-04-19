'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Download,
  Eye,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileSpreadsheet,
  Loader2,
  FolderOpen,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Info,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import { getFileDownloadUrl } from '@/app/actions/project-files';
import { Button } from '@/components/ui/button';
import { FilePreviewModal } from '@/components/portal/file-preview-modal';
import type { PortalFileWithProject } from './page';

/* ------------------------------------------------------------------ */
/* File icon helper                                                     */
/* ------------------------------------------------------------------ */

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File className="h-5 w-5 text-muted-foreground" />;

  if (mimeType.startsWith('image/')) {
    return <FileImage className="h-5 w-5 text-blue-500" />;
  }
  if (mimeType.startsWith('video/')) {
    return <FileVideo className="h-5 w-5 text-purple-500" />;
  }
  if (mimeType.startsWith('audio/')) {
    return <FileAudio className="h-5 w-5 text-green-500" />;
  }
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) {
    return <FileArchive className="h-5 w-5 text-orange-500" />;
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
    return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
  }
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
    return <FileText className="h-5 w-5 text-red-500" />;
  }

  return <File className="h-5 w-5 text-muted-foreground" />;
}

/* ------------------------------------------------------------------ */
/* Format file size                                                     */
/* ------------------------------------------------------------------ */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function isPreviewable(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith('image/') || mimeType === 'application/pdf';
}

function groupFilesByPhase(
  files: PortalFileWithProject[]
): { phaseName: string; files: PortalFileWithProject[] }[] {
  const phaseMap = new Map<string, PortalFileWithProject[]>();

  for (const file of files) {
    const phase = file.phase_name?.trim() || 'General';
    const existing = phaseMap.get(phase);
    if (existing) {
      existing.push(file);
    } else {
      phaseMap.set(phase, [file]);
    }
  }

  // Put "General" first, then alphabetical
  const entries = Array.from(phaseMap.entries());
  entries.sort((a, b) => {
    if (a[0] === 'General') return -1;
    if (b[0] === 'General') return 1;
    return a[0].localeCompare(b[0]);
  });

  return entries.map(([phaseName, phaseFiles]) => ({ phaseName, files: phaseFiles }));
}

/* ------------------------------------------------------------------ */
/* PhaseSubSection (collapsible sub-group within a project)             */
/* ------------------------------------------------------------------ */

function PhaseSubSection({
  phaseName,
  files,
  downloadingFileId,
  onDownload,
  onPreview,
}: {
  phaseName: string;
  files: PortalFileWithProject[];
  downloadingFileId: string | null;
  onDownload: (fileId: string, fileName: string) => void;
  onPreview: (file: PortalFileWithProject) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div>
      {/* Phase header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex w-full items-center gap-2.5 bg-muted/20 px-5 py-2.5 text-left transition-colors duration-150',
          'hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30',
          'cursor-pointer border-t border-border/30'
        )}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
        )}
        <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {phaseName}
        </span>
        <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground/70">
          {files.length}
        </span>
      </button>

      {/* File rows */}
      {isExpanded &&
        files.map((file, index) => (
          <div
            key={file.id}
            className={cn(
              'flex items-center gap-4 px-5 py-4 transition-colors duration-150',
              'hover:bg-muted/30',
              index < files.length - 1 && 'border-b border-border/20'
            )}
          >
            {/* File icon */}
            <div className="flex-shrink-0">{getFileIcon(file.mime_type)}</div>

            {/* File info */}
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-medium text-foreground"
                title={file.original_name}
              >
                {file.original_name}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground/70">
                <span>{formatFileSize(file.file_size)}</span>
                {file.uploader_name && <span>by {file.uploader_name}</span>}
                {file.created_at && <span>{formatRelativeTime(file.created_at)}</span>}
              </div>
              {file.description && (
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground/60">
                  {file.description}
                </p>
              )}
            </div>

            {/* Preview button (for images and PDFs) */}
            {isPreviewable(file.mime_type) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPreview(file)}
                className="min-h-[44px] min-w-[44px] flex-shrink-0 cursor-pointer"
                aria-label={`Preview ${file.original_name}`}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}

            {/* Download button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDownload(file.id, file.original_name)}
              disabled={downloadingFileId === file.id}
              className="min-h-[44px] min-w-[44px] flex-shrink-0 cursor-pointer"
              aria-label={`Download ${file.original_name}`}
            >
              {downloadingFileId === file.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ProjectSection (collapsible)                                         */
/* ------------------------------------------------------------------ */

function ProjectSection({
  projectId,
  projectName,
  files,
  downloadingFileId,
  onDownload,
  onPreview,
}: {
  projectId: string;
  projectName: string;
  files: PortalFileWithProject[];
  downloadingFileId: string | null;
  onDownload: (fileId: string, fileName: string) => void;
  onPreview: (file: PortalFileWithProject) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const phaseGroups = groupFilesByPhase(files);
  const hasMultiplePhases =
    phaseGroups.length > 1 || (phaseGroups.length === 1 && phaseGroups[0].phaseName !== 'General');

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      {/* Section header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors duration-150',
          'hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30',
          'cursor-pointer'
        )}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground/60" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/60" />
        )}
        <FolderOpen className="h-4 w-4 flex-shrink-0 text-primary/70" />
        <span className="flex-1 text-sm font-semibold text-foreground">{projectName}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          {files.length} {files.length === 1 ? 'file' : 'files'}
        </span>
      </button>

      {/* File list grouped by phase */}
      {isExpanded && (
        <div>
          {hasMultiplePhases ? (
            /* Render phase sub-sections */
            phaseGroups.map((group) => (
              <PhaseSubSection
                key={group.phaseName}
                phaseName={group.phaseName}
                files={group.files}
                downloadingFileId={downloadingFileId}
                onDownload={onDownload}
                onPreview={onPreview}
              />
            ))
          ) : (
            /* Single group (all General) — render flat list without phase header */
            <div className="border-t border-border/30">
              {files.map((file, index) => (
                <div
                  key={file.id}
                  className={cn(
                    'flex items-center gap-4 px-5 py-4 transition-colors duration-150',
                    'hover:bg-muted/30',
                    index < files.length - 1 && 'border-b border-border/30'
                  )}
                >
                  <div className="flex-shrink-0">{getFileIcon(file.mime_type)}</div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium text-foreground"
                      title={file.original_name}
                    >
                      {file.original_name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground/70">
                      <span>{formatFileSize(file.file_size)}</span>
                      {file.uploader_name && <span>by {file.uploader_name}</span>}
                      {file.created_at && <span>{formatRelativeTime(file.created_at)}</span>}
                    </div>
                    {file.description && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground/60">
                        {file.description}
                      </p>
                    )}
                  </div>
                  {isPreviewable(file.mime_type) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onPreview(file)}
                      className="min-h-[44px] min-w-[44px] flex-shrink-0 cursor-pointer"
                      aria-label={`Preview ${file.original_name}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDownload(file.id, file.original_name)}
                    disabled={downloadingFileId === file.id}
                    className="min-h-[44px] min-w-[44px] flex-shrink-0 cursor-pointer"
                    aria-label={`Download ${file.original_name}`}
                  >
                    {downloadingFileId === file.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Link to project files tab */}
          <div className="border-t border-border/30 px-5 py-3">
            <Link
              href={`/projects/${projectId}/files`}
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-medium text-primary/80 transition-colors duration-150',
                'cursor-pointer hover:text-primary',
                'rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
              )}
            >
              View all project files
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PortalFilesContent (exported)                                        */
/* ------------------------------------------------------------------ */

interface PortalFilesContentProps {
  files: PortalFileWithProject[];
}

export function PortalFilesContent({ files }: PortalFilesContentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{
    id: string;
    original_name: string;
    mime_type: string;
    url: string;
  } | null>(null);

  /* ---- Download handler ---- */
  const handleDownload = async (fileId: string, fileName: string) => {
    setDownloadingFileId(fileId);
    try {
      const result = await getFileDownloadUrl(fileId);
      if (result.success && result.data) {
        const { url } = result.data as { url: string; filename: string };
        window.open(url, '_blank');
        toast.success(`Downloading ${fileName}`);
      } else {
        toast.error('Download Failed', { description: result.error || 'Failed to download file' });
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download Failed', { description: 'An unexpected error occurred' });
    } finally {
      setDownloadingFileId(null);
    }
  };

  /* ---- Preview handler ---- */
  const handlePreview = async (file: PortalFileWithProject) => {
    try {
      const result = await getFileDownloadUrl(file.id);
      if (result.success && result.data) {
        const { url } = result.data as { url: string; filename: string };
        setPreviewFile({
          id: file.id,
          original_name: file.original_name,
          mime_type: file.mime_type || '',
          url,
        });
      } else {
        toast.error('Preview Failed', { description: result.error || 'Could not load preview' });
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Preview Failed', { description: 'An unexpected error occurred' });
    }
  };

  /* ---- Filter files by search ---- */
  const filteredFiles = searchQuery.trim()
    ? files.filter((f) => f.original_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  /* ---- Group filtered files by project ---- */
  const groupedByProject = new Map<
    string,
    { projectName: string; files: PortalFileWithProject[] }
  >();

  for (const file of filteredFiles) {
    const existing = groupedByProject.get(file.project_id);
    if (existing) {
      existing.files.push(file);
    } else {
      groupedByProject.set(file.project_id, {
        projectName: file.project_name,
        files: [file],
      });
    }
  }

  const projectGroups = Array.from(groupedByProject.entries());

  /* ---- Empty state ---- */
  if (files.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-qualia-500/10 to-qualia-600/5 ring-1 ring-primary/10">
            <FolderOpen className="h-10 w-10 text-primary/60" />
          </div>
          <h3 className="text-xl font-semibold tracking-tight text-foreground">No files yet</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground/80">
            Deliverables and project files will appear here once your team shares them.
          </p>
          <div className="mx-auto mt-6 flex items-center gap-2 rounded-md border border-dashed border-muted-foreground/20 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>To upload files, open a project and use the Files tab.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload hint banner */}
      <div className="flex items-center gap-2 rounded-md border border-dashed border-muted-foreground/20 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>To upload files, open a project and use the Files tab.</span>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
        <input
          type="search"
          placeholder="Search files by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn(
            'h-10 w-full rounded-lg border border-border/60 bg-card pl-10 pr-4 text-sm text-foreground',
            'placeholder:text-muted-foreground/50',
            'transition-colors duration-150',
            'hover:border-border',
            'focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20'
          )}
          aria-label="Search files"
        />
      </div>

      {/* File count summary */}
      <p className="text-xs text-muted-foreground/60">
        {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'}
        {searchQuery.trim() && ` matching "${searchQuery.trim()}"`}
        {' across '}
        {projectGroups.length} {projectGroups.length === 1 ? 'project' : 'projects'}
      </p>

      {/* No search results */}
      {filteredFiles.length === 0 && searchQuery.trim() && (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="text-center">
            <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">No files found</p>
            <p className="mt-1 text-xs text-muted-foreground/70">Try a different search term</p>
          </div>
        </div>
      )}

      {/* Project groups */}
      <div className="space-y-4">
        {projectGroups.map(([projectId, group]) => (
          <ProjectSection
            key={projectId}
            projectId={projectId}
            projectName={group.projectName}
            files={group.files}
            downloadingFileId={downloadingFileId}
            onDownload={handleDownload}
            onPreview={handlePreview}
          />
        ))}
      </div>

      {/* File preview modal */}
      <FilePreviewModal
        open={!!previewFile}
        onOpenChange={(open) => {
          if (!open) setPreviewFile(null);
        }}
        file={previewFile}
      />
    </div>
  );
}

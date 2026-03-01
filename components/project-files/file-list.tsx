'use client';

import { useState } from 'react';
import { deleteProjectFile, getFileDownloadUrl } from '@/app/actions/project-files';
import type { ProjectFile } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Eye,
  EyeOff,
  Download,
  Trash2,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface FileListProps {
  projectId: string;
  files: ProjectFile[];
  onFileDeleted?: () => void;
}

export function FileList({ projectId, files, onFileDeleted }: FileListProps) {
  const { toast } = useToast();
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<ProjectFile | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <File className="h-5 w-5 text-neutral-400" />;

    if (mimeType.startsWith('image/')) {
      return <FileImage className="h-5 w-5 text-blue-500" />;
    }
    if (mimeType.startsWith('video/')) {
      return <FileVideo className="h-5 w-5 text-purple-500" />;
    }
    if (mimeType.startsWith('audio/')) {
      return <FileAudio className="h-5 w-5 text-green-500" />;
    }
    if (
      mimeType.includes('zip') ||
      mimeType.includes('rar') ||
      mimeType.includes('archive')
    ) {
      return <FileArchive className="h-5 w-5 text-orange-500" />;
    }
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }

    return <File className="h-5 w-5 text-neutral-400" />;
  };

  const handleDownload = async (fileId: string) => {
    setDownloadingFileId(fileId);
    try {
      const result = await getFileDownloadUrl(fileId);

      if (result.success && result.data) {
        const { url } = result.data as { url: string; filename: string };
        window.open(url, '_blank');
      } else {
        toast({
          title: 'Download Failed',
          description: result.error || 'Failed to generate download URL',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    setDeletingFileId(fileToDelete.id);
    try {
      const result = await deleteProjectFile(fileToDelete.id);

      if (result.success) {
        toast({
          title: 'File Deleted',
          description: `${fileToDelete.original_name} has been deleted`,
        });

        if (onFileDeleted) {
          onFileDeleted();
        }
      } else {
        toast({
          title: 'Delete Failed',
          description: result.error || 'Failed to delete file',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setDeletingFileId(null);
      setFileToDelete(null);
    }
  };

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <File className="mb-4 h-12 w-12 text-neutral-400" />
        <h3 className="mb-2 text-lg font-semibold text-neutral-900">No files yet</h3>
        <p className="text-sm text-neutral-600">Upload your first file to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>File Name</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead className="hidden lg:table-cell">Phase</TableHead>
              <TableHead className="hidden sm:table-cell">Visibility</TableHead>
              <TableHead className="hidden lg:table-cell">Uploaded</TableHead>
              <TableHead className="hidden xl:table-cell">By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id}>
                {/* File Icon */}
                <TableCell>{getFileIcon(file.mime_type)}</TableCell>

                {/* File Name */}
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="truncate">{file.original_name}</span>
                    <span className="text-xs text-neutral-500">
                      {(file.file_size / 1024).toFixed(2)} KB
                    </span>
                  </div>
                </TableCell>

                {/* Description */}
                <TableCell className="hidden max-w-xs truncate md:table-cell">
                  <span className="text-sm text-neutral-600">
                    {file.description || <span className="italic text-neutral-400">No description</span>}
                  </span>
                </TableCell>

                {/* Phase */}
                <TableCell className="hidden lg:table-cell">
                  {file.phase ? (
                    <Badge variant="outline" className="text-xs">
                      {file.phase.phase_name}
                    </Badge>
                  ) : (
                    <span className="text-xs italic text-neutral-400">No phase</span>
                  )}
                </TableCell>

                {/* Visibility */}
                <TableCell className="hidden sm:table-cell">
                  {file.is_client_visible ? (
                    <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                      <Eye className="mr-1 h-3 w-3" />
                      Client visible
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-neutral-600">
                      <EyeOff className="mr-1 h-3 w-3" />
                      Internal only
                    </Badge>
                  )}
                </TableCell>

                {/* Upload Date */}
                <TableCell className="hidden text-sm text-neutral-600 lg:table-cell">
                  {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
                </TableCell>

                {/* Uploaded By */}
                <TableCell className="hidden text-sm text-neutral-600 xl:table-cell">
                  {file.uploader?.full_name || 'Unknown'}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(file.id)}
                      disabled={downloadingFileId === file.id}
                    >
                      {downloadingFileId === file.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFileToDelete(file)}
                      disabled={deletingFileId === file.id}
                    >
                      {deletingFileId === file.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-500" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{fileToDelete?.original_name}&quot;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

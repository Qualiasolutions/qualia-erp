'use client';

import { useState } from 'react';
import { uploadProjectFile } from '@/app/actions/project-files';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUploadFormProps {
  projectId: string;
  phases: { id: string; phase_name: string }[];
  onUploadComplete?: () => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function FileUploadForm({ projectId, phases, onUploadComplete }: FileUploadFormProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string>('none');
  const [isClientVisible, setIsClientVisible] = useState(false);
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setFileSizeError(null);

    if (file && file.size > MAX_FILE_SIZE) {
      setFileSizeError(`File size exceeds 50MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast({
        title: 'Error',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }

    if (fileSizeError) {
      toast({
        title: 'Error',
        description: fileSizeError,
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('project_id', projectId);
      if (description) formData.append('description', description);
      if (selectedPhase && selectedPhase !== 'none') formData.append('phase_id', selectedPhase);
      formData.append('is_client_visible', String(isClientVisible));

      const result = await uploadProjectFile(formData);

      if (result.success) {
        toast({
          title: 'Success',
          description: `${selectedFile.name} uploaded successfully`,
        });

        // Reset form
        setSelectedFile(null);
        setDescription('');
        setSelectedPhase('');
        setIsClientVisible(false);
        setFileSizeError(null);

        // Reset file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

        // Call completion callback
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        toast({
          title: 'Upload Failed',
          description: result.error || 'Failed to upload file',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload File</CardTitle>
        <CardDescription>Upload files, documents, or deliverables for this project</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="file-input">File *</Label>
            <Input
              id="file-input"
              type="file"
              onChange={handleFileChange}
              disabled={isUploading}
              className={fileSizeError ? 'border-red-500' : ''}
            />
            {selectedFile && !fileSizeError && (
              <p className="text-sm text-neutral-600">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
            {fileSizeError && <p className="text-sm text-red-600">{fileSizeError}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add a description for this file..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isUploading}
              rows={3}
            />
          </div>

          {/* Phase Selection */}
          <div className="space-y-2">
            <Label htmlFor="phase">Associated Phase</Label>
            <Select value={selectedPhase} onValueChange={setSelectedPhase} disabled={isUploading}>
              <SelectTrigger id="phase">
                <SelectValue placeholder="No phase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No phase</SelectItem>
                {phases.map((phase) => (
                  <SelectItem key={phase.id} value={phase.id}>
                    {phase.phase_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client Visibility Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="client-visible" className="text-base">
                Share with client
              </Label>
              <p className="text-sm text-neutral-600">Client will see this file in their portal</p>
            </div>
            <Switch
              id="client-visible"
              checked={isClientVisible}
              onCheckedChange={setIsClientVisible}
              disabled={isUploading}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isUploading || !selectedFile || !!fileSizeError}
            className="w-full sm:w-auto"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileAudio, X, AlertCircle } from 'lucide-react';
import { AxiosError } from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { transcriptionsApi } from '@/lib/api/endpoints/transcriptions';
import { useQueryClient } from '@tanstack/react-query';

interface UploadTranscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const ACCEPTED_FILE_TYPES = {
  'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'],
  'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
  'text/plain': ['.txt'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
};

export function UploadTranscriptionModal({
  open,
  onOpenChange,
}: UploadTranscriptionModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const queryClient = useQueryClient();

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: unknown[]) => {
    setError(null);

    if (rejectedFiles && Array.isArray(rejectedFiles) && rejectedFiles.length > 0) {
      setError('Invalid file type or size. Please upload an audio/video file, or text file (.txt, .doc, .docx) under 2GB.');
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];

      if (file.size > MAX_FILE_SIZE) {
        setError('File size exceeds 2GB limit');
        return;
      }

      setSelectedFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      // Don't send fileName - backend will use file.originalname

      // Simulate progress (since we can't track multipart upload easily)
      setUploadProgress(25);

      // Upload file directly to backend
      await transcriptionsApi.uploadDirect(formData);

      setUploadProgress(100);

      // Invalidate queries to refetch transcriptions list
      queryClient.invalidateQueries({ queryKey: ['transcriptions'] });

      // Success - close modal and reset
      setTimeout(() => {
        onOpenChange(false);
        resetModal();
      }, 500);
    } catch (err: unknown) {
      console.error('Upload error:', err);
      let errorMessage = 'Failed to upload file';

      if (err instanceof AxiosError) {
        if (err.response?.status === 401) {
          errorMessage = 'Your session has expired. Please refresh the page or log in again.';
        } else if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.message) {
          errorMessage = err.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setIsUploading(false);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setError(null);
    setIsUploading(false);
  };

  const handleClose = () => {
    if (!isUploading) {
      onOpenChange(false);
      resetModal();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Recording or Transcript</DialogTitle>
          <DialogDescription>
            Upload a client meeting recording for AI-powered transcription and analysis, or upload an already-transcribed text file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedFile ? (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                ${isUploading ? 'pointer-events-none opacity-50' : ''}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              {isDragActive ? (
                <p className="text-sm text-gray-600">Drop the file here...</p>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-1">
                    Drag and drop a file here, or click to browse
                  </p>
                  <p className="text-xs text-gray-500">
                    Supports audio/video files (mp3, wav, mp4, etc.) or text files (.txt, .doc, .docx) up to 2GB
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <FileAudio className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                {!isUploading && (
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {isUploading && (
                <div className="mt-4 space-y-2">
                  <Progress value={uploadProgress} />
                  <p className="text-xs text-gray-500 text-center">
                    {uploadProgress < 25
                      ? 'Preparing upload...'
                      : uploadProgress < 100
                      ? 'Uploading...'
                      : 'Upload complete!'}
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="gap-2"
          >
            {isUploading ? (
              <>Uploading...</>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

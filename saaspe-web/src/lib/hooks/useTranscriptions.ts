import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transcriptionsApi } from '../api/endpoints/transcriptions';

export function useTranscriptions(
  page: number = 1,
  limit: number = 20,
  status?: string,
  clientId?: string
) {
  return useQuery({
    queryKey: ['transcriptions', page, limit, status, clientId],
    queryFn: () => transcriptionsApi.getAll(page, limit, status, clientId),
  });
}

export function useTranscription(id: string) {
  return useQuery({
    queryKey: ['transcriptions', id],
    queryFn: () => transcriptionsApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transcriptionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transcriptions'] });
    },
  });
}

export function useAnalyzeTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => transcriptionsApi.analyze(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transcriptions'] });
    },
  });
}

export function useUploadFile() {
  return useMutation({
    mutationFn: async ({
      uploadUrl,
      file,
      onProgress,
    }: {
      uploadUrl: string;
      file: File;
      onProgress?: (progress: number) => void;
    }) => {
      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });
    },
  });
}

export function useDeleteTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => transcriptionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transcriptions'] });
    },
  });
}

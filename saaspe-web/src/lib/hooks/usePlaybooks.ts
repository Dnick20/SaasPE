import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  playbooksApi,
  CreatePlaybookDto,
  UpdatePlaybookDto,
  PlaybookResponse,
} from '../api/endpoints/playbooks';

/**
 * Get all playbooks for tenant
 */
export function usePlaybooks() {
  return useQuery({
    queryKey: ['playbooks'],
    queryFn: () => playbooksApi.getAll(),
  });
}

/**
 * Get playbooks for a specific client
 */
export function useClientPlaybooks(clientId: string | undefined) {
  return useQuery({
    queryKey: ['playbooks', 'client', clientId],
    queryFn: () => playbooksApi.getByClient(clientId!),
    enabled: !!clientId,
  });
}

/**
 * Get a single playbook by ID
 */
export function usePlaybook(id: string | undefined) {
  return useQuery({
    queryKey: ['playbooks', id],
    queryFn: () => playbooksApi.getById(id!),
    enabled: !!id,
  });
}

/**
 * Create a new playbook
 */
export function useCreatePlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePlaybookDto) => playbooksApi.create(data),
    onSuccess: (newPlaybook) => {
      // Invalidate all playbook queries
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
      // Also invalidate client-specific playbooks
      queryClient.invalidateQueries({
        queryKey: ['playbooks', 'client', newPlaybook.clientId],
      });
    },
  });
}

/**
 * Update a playbook
 */
export function useUpdatePlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlaybookDto }) =>
      playbooksApi.update(id, data),
    onSuccess: (updatedPlaybook) => {
      // Invalidate all playbook queries
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
      // Invalidate specific playbook
      queryClient.invalidateQueries({
        queryKey: ['playbooks', updatedPlaybook.id],
      });
      // Invalidate client-specific playbooks
      queryClient.invalidateQueries({
        queryKey: ['playbooks', 'client', updatedPlaybook.clientId],
      });
    },
  });
}

/**
 * Delete a playbook
 */
export function useDeletePlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => playbooksApi.delete(id),
    onSuccess: () => {
      // Invalidate all playbook queries
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
    },
  });
}

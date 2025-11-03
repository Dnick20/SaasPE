import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mailboxesApi, CreateMailboxDto, UpdateMailboxDto } from '../api/mailboxes';

/**
 * React Query hooks for mailboxes
 *
 * Usage:
 * ```tsx
 * const { data, isLoading } = useMailboxes();
 * const createMailbox = useCreateMailbox();
 * ```
 */

/**
 * Fetch all mailboxes for the tenant
 */
export function useMailboxes(
  page: number = 1,
  limit: number = 20,
  status?: string
) {
  return useQuery({
    queryKey: ['mailboxes', page, limit, status],
    queryFn: () => mailboxesApi.findAll({ page, limit, status }),
  });
}

/**
 * Fetch a single mailbox by ID
 */
export function useMailbox(id: string) {
  return useQuery({
    queryKey: ['mailboxes', id],
    queryFn: () => mailboxesApi.findOne(id),
    enabled: !!id,
  });
}

/**
 * Create a new mailbox
 */
export function useCreateMailbox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMailboxDto) => mailboxesApi.create(data),
    onSuccess: () => {
      // Invalidate mailboxes list to refetch
      queryClient.invalidateQueries({ queryKey: ['mailboxes'] });
    },
  });
}

/**
 * Update an existing mailbox
 */
export function useUpdateMailbox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMailboxDto }) =>
      mailboxesApi.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidate both list and specific mailbox
      queryClient.invalidateQueries({ queryKey: ['mailboxes'] });
      queryClient.invalidateQueries({ queryKey: ['mailboxes', variables.id] });
    },
  });
}

/**
 * Delete a mailbox
 */
export function useDeleteMailbox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => mailboxesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mailboxes'] });
    },
  });
}

/**
 * Test mailbox connection
 */
export function useTestMailboxConnection() {
  return useMutation({
    mutationFn: (id: string) => mailboxesApi.testConnection(id),
  });
}

/**
 * Bulk import mailboxes from CSV
 */
export function useBulkImportMailboxes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { mailboxes: CreateMailboxDto[] }) => mailboxesApi.bulkImport(data),
    onSuccess: () => {
      // Invalidate mailboxes list to refetch with new imports
      queryClient.invalidateQueries({ queryKey: ['mailboxes'] });
    },
  });
}

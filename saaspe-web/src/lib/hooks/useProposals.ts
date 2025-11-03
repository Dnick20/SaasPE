// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { proposalsApi } from '../api/endpoints/proposals';

export function useProposals(
  page: number = 1,
  limit: number = 20,
  status?: string,
  clientId?: string
) {
  return useQuery({
    queryKey: ['proposals', page, limit, status, clientId],
    queryFn: () => proposalsApi.getAll(page, limit, status, clientId),
  });
}

export function useProposal(id: string) {
  return useQuery({
    queryKey: ['proposals', id],
    queryFn: () => proposalsApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: proposalsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}

export function useUpdateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Record<string, unknown>> }) =>
      proposalsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}

export function useGenerateProposalContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, sections }: { id: string; sections: string[] }) =>
      proposalsApi.generateContent(id, sections),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}

export function useExportProposalPdf() {
  return useMutation({
    mutationFn: (id: string) => proposalsApi.exportPdf(id),
  });
}

export function useSendProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: {
      recipientEmail: string;
      recipientName: string;
      includeESignature: boolean;
      message?: string;
    } }) =>
      proposalsApi.send(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}

export function useDeleteProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => proposalsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}

// ========== Pricing V2 Hooks ==========

export function useAddPricingOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ proposalId, data }: { proposalId: string; data: Record<string, unknown> }) =>
      proposalsApi.addPricingOption(proposalId, data as any),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', variables.proposalId] });
    },
  });
}

export function useUpdatePricingOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      proposalId,
      optionId,
      data,
    }: {
      proposalId: string;
      optionId: string;
      data: Record<string, unknown>;
    }) => proposalsApi.updatePricingOption(proposalId, optionId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', variables.proposalId] });
    },
  });
}

export function useDeletePricingOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ proposalId, optionId }: { proposalId: string; optionId: string }) =>
      proposalsApi.deletePricingOption(proposalId, optionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', variables.proposalId] });
    },
  });
}

export function useAddLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      proposalId,
      optionId,
      data,
    }: {
      proposalId: string;
      optionId: string;
      data: Record<string, unknown>;
    }) => proposalsApi.addLineItem(proposalId, optionId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', variables.proposalId] });
    },
  });
}

export function useUpdateLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      proposalId,
      optionId,
      lineItemId,
      data,
    }: {
      proposalId: string;
      optionId: string;
      lineItemId: string;
      data: Record<string, unknown>;
    }) => proposalsApi.updateLineItem(proposalId, optionId, lineItemId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', variables.proposalId] });
    },
  });
}

export function useDeleteLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      proposalId,
      optionId,
      lineItemId,
    }: {
      proposalId: string;
      optionId: string;
      lineItemId: string;
    }) => proposalsApi.deleteLineItem(proposalId, optionId, lineItemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', variables.proposalId] });
    },
  });
}

export function useAddPricingNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ proposalId, data }: { proposalId: string; data: Record<string, unknown> }) =>
      proposalsApi.addPricingNote(proposalId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', variables.proposalId] });
    },
  });
}

export function useUpdatePricingNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      proposalId,
      noteId,
      data,
    }: {
      proposalId: string;
      noteId: string;
      data: Record<string, unknown>;
    }) => proposalsApi.updatePricingNote(proposalId, noteId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', variables.proposalId] });
    },
  });
}

export function useDeletePricingNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ proposalId, noteId }: { proposalId: string; noteId: string }) =>
      proposalsApi.deletePricingNote(proposalId, noteId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', variables.proposalId] });
    },
  });
}

export function useSeedPricingBlueprints() {
  return useMutation({
    mutationFn: () => proposalsApi.seedPricingBlueprints(),
  });
}

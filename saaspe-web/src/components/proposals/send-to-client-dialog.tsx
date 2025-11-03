'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, Loader2, Mail, FileSignature } from 'lucide-react';
import { toast } from 'sonner';

const sendProposalSchema = z.object({
  recipientEmail: z.string().email('Invalid email address'),
  recipientName: z.string().min(1, 'Recipient name is required'),
  message: z.string().optional(),
});

type SendProposalFormData = z.infer<typeof sendProposalSchema>;

interface SendToClientDialogProps {
  proposalId: string;
  clientEmail?: string;
  clientName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SendToClientDialog({
  proposalId,
  clientEmail = '',
  clientName = '',
  isOpen,
  onClose,
  onSuccess,
}: SendToClientDialogProps) {
  const queryClient = useQueryClient();
  const [includeESignature, setIncludeESignature] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SendProposalFormData>({
    resolver: zodResolver(sendProposalSchema),
    defaultValues: {
      recipientEmail: clientEmail,
      recipientName: clientName,
      message: '',
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (data: SendProposalFormData) => {
      const response = await fetch(`/api/v1/proposals/${proposalId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          includeESignature,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send proposal');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Proposal sent successfully!');
      queryClient.invalidateQueries({ queryKey: ['proposal', proposalId] });
      reset();
      onSuccess?.();
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send proposal');
    },
  });

  const onSubmit = (data: SendProposalFormData) => {
    sendMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Proposal to Client</DialogTitle>
          <DialogDescription>
            Send this signed proposal to your client. You can optionally include DocuSign e-signature for the client to sign electronically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="recipientName">Recipient Name *</Label>
              <Input
                id="recipientName"
                {...register('recipientName')}
                placeholder="e.g., John Smith"
                className="mt-1"
              />
              {errors.recipientName && (
                <p className="text-sm text-red-600 mt-1">{errors.recipientName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="recipientEmail">Recipient Email *</Label>
              <Input
                id="recipientEmail"
                type="email"
                {...register('recipientEmail')}
                placeholder="e.g., john@example.com"
                className="mt-1"
              />
              {errors.recipientEmail && (
                <p className="text-sm text-red-600 mt-1">{errors.recipientEmail.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="message">Custom Message (Optional)</Label>
            <Textarea
              id="message"
              {...register('message')}
              placeholder="Add a personal message to the client..."
              rows={4}
              className="mt-1 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              This message will be included in the email to the client
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="includeESignature"
                checked={includeESignature}
                onCheckedChange={(checked) => setIncludeESignature(checked === true)}
                className="mt-1"
              />
              <div className="flex-1">
                <label
                  htmlFor="includeESignature"
                  className="font-medium text-blue-900 cursor-pointer flex items-center gap-2"
                >
                  <FileSignature className="h-4 w-4" />
                  Include DocuSign E-Signature
                </label>
                <p className="text-sm text-blue-700 mt-1">
                  {includeESignature
                    ? 'The client will receive a DocuSign envelope to sign the proposal electronically. You\'ll be notified when they sign.'
                    : 'The proposal will be sent as a PDF via email without e-signature capability.'}
                </p>
              </div>
            </div>
          </div>

          {includeESignature && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <FileSignature className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-green-900 mb-1">
                    Two-Stage Signature Workflow
                  </h4>
                  <p className="text-sm text-green-700">
                    Since you've already signed this proposal, the client will receive a pre-signed document via DocuSign. After they sign, you'll receive the fully executed proposal.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={sendMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={sendMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  {includeESignature ? (
                    <FileSignature className="h-4 w-4 mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Send Proposal
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

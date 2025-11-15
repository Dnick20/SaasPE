'use client';

import { useState, useRef } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PenTool, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import SignatureCanvas from 'react-signature-canvas';

const agencySignSchema = z.object({
  signerName: z.string().min(1, 'Signer name is required'),
  signatureImage: z.string().optional(),
});

type AgencySignFormData = z.infer<typeof agencySignSchema>;

interface AgencySignatureDialogProps {
  proposalId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AgencySignatureDialog({
  proposalId,
  isOpen,
  onClose,
  onSuccess,
}: AgencySignatureDialogProps) {
  const queryClient = useQueryClient();
  const [signatureMethod, setSignatureMethod] = useState<'draw' | 'upload'>('draw');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const signatureCanvasRef = useRef<SignatureCanvas | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AgencySignFormData>({
    resolver: zodResolver(agencySignSchema),
    defaultValues: {
      signerName: '',
      signatureImage: '',
    },
  });

  const signMutation = useMutation({
    mutationFn: async (data: AgencySignFormData) => {
      const response = await fetch(`/api/v1/proposals/${proposalId}/agency-sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sign proposal');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Proposal signed successfully!');
      queryClient.invalidateQueries({ queryKey: ['proposal', proposalId] });
      reset();
      setUploadedImage(null);
      if (signatureCanvasRef.current) {
        signatureCanvasRef.current.clear();
      }
      onSuccess?.();
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to sign proposal');
    },
  });

  const handleClearSignature = () => {
    if (signatureCanvasRef.current) {
      signatureCanvasRef.current.clear();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be smaller than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (data: AgencySignFormData) => {
    let signatureImage: string | undefined;

    if (signatureMethod === 'draw') {
      // Get signature from canvas
      if (signatureCanvasRef.current && !signatureCanvasRef.current.isEmpty()) {
        signatureImage = signatureCanvasRef.current.toDataURL('image/png');
      } else {
        toast.error('Please draw your signature');
        return;
      }
    } else if (signatureMethod === 'upload') {
      // Use uploaded image
      if (!uploadedImage) {
        toast.error('Please upload a signature image');
        return;
      }
      signatureImage = uploadedImage;
    }

    signMutation.mutate({
      ...data,
      signatureImage,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agency Signature</DialogTitle>
          <DialogDescription>
            Sign this proposal before sending it to the client. This is the first step in the two-stage signature process.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="signerName">Your Name *</Label>
            <Input
              id="signerName"
              {...register('signerName')}
              placeholder="Enter your full name"
              className="mt-1"
            />
            {errors.signerName && (
              <p className="text-sm text-red-600 mt-1">{errors.signerName.message}</p>
            )}
          </div>

          <div>
            <Label className="mb-3 block">Signature</Label>
            <Tabs value={signatureMethod} onValueChange={(v) => setSignatureMethod(v as 'draw' | 'upload')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="draw" className="gap-2">
                  <PenTool className="h-4 w-4" />
                  Draw
                </TabsTrigger>
                <TabsTrigger value="upload" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload
                </TabsTrigger>
              </TabsList>

              <TabsContent value="draw" className="mt-4">
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white">
                    <SignatureCanvas
                      ref={signatureCanvasRef}
                      canvasProps={{
                        className: 'w-full h-48 cursor-crosshair',
                      }}
                      backgroundColor="white"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearSignature}
                  >
                    Clear Signature
                  </Button>
                  <p className="text-xs text-gray-500">
                    Draw your signature in the box above using your mouse or trackpad
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="mt-4">
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50 text-center">
                    {uploadedImage ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center">
                          <img
                            src={uploadedImage}
                            alt="Signature"
                            className="max-h-32 border border-gray-200 rounded bg-white p-2"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setUploadedImage(null)}
                        >
                          Remove Image
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-600 mb-3">
                          Upload an image of your signature
                        </p>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="max-w-xs mx-auto"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Supported formats: PNG, JPG, GIF (max 2MB)
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={signMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={signMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {signMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Sign Proposal
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

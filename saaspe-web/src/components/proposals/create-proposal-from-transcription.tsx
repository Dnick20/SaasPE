'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TranscriptionSelector } from './transcription-selector';
import { apiClient } from '@/lib/api/client';

interface CreateProposalFromTranscriptionProps {
  clientId?: string;
  initialTranscriptionId?: string;
  onBack: () => void;
}

type GenerationStatus = 'idle' | 'generating' | 'success' | 'error';

export function CreateProposalFromTranscription({
  clientId,
  initialTranscriptionId,
  onBack,
}: CreateProposalFromTranscriptionProps) {
  const router = useRouter();
  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://api.saasope.com');
  const [selectedTranscriptionId, setSelectedTranscriptionId] = useState<string | null>(initialTranscriptionId || null);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [generatedProposalId, setGeneratedProposalId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Polling function to check if proposal is ready
  const pollProposalStatus = async (proposalId: string): Promise<boolean> => {
    const maxAttempts = 60; // 2 minutes max (60 * 2 seconds)
    let attempts = 0;

    // Start timer
    const timerInterval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    try {
      while (attempts < maxAttempts) {
        const { data: proposal } = await apiClient.get(`${API_BASE}/api/v1/proposals/${proposalId}`);

        // Check if proposal is ready
        if (proposal.status === 'ready' || proposal.status === 'draft') {
          clearInterval(timerInterval);
          return true;
        }

        // Wait 2 seconds before next attempt
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
      }

      // Timeout reached
      clearInterval(timerInterval);
      return false;
    } catch (error) {
      clearInterval(timerInterval);
      throw error;
    }
  };

  const handleGenerate = async (data: {
    transcriptionId: string;
    title: string;
    coverPageData?: {
      term?: string;
      startDate?: string;
      endDate?: string;
      preparedBy?: string;
      preparedFor?: string;
    };
  }) => {
    try {
      setStatus('generating');
      setError(null);
      setElapsedTime(0);

      const { data: result } = await apiClient.post(`${API_BASE}/api/v1/proposals/from-transcription`, {
        ...(clientId && { clientId }),
        transcriptionId: data.transcriptionId,
        title: data.title,
        coverPageData: data.coverPageData,
        tableOfContents: true,
      });
      setGeneratedProposalId(result.id);

      // Poll for proposal completion
      const isReady = await pollProposalStatus(result.id);

      if (!isReady) {
        throw new Error('Proposal generation timed out. The proposal may still be processing - please check your proposals list.');
      }

      setStatus('success');

      // Show success message briefly, then redirect
      setTimeout(() => {
        router.push(`/dashboard/proposals/${result.id}/edit`);
      }, 1500);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  };

  if (status === 'generating') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
              <Sparkles className="h-8 w-8 text-yellow-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                Generating Your Proposal with AI
              </h3>
              <p className="text-gray-500 max-w-md">
                Our AI is analyzing the transcription and creating a professional proposal tailored to your client's needs. This usually takes 20-30 seconds...
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Elapsed time: {elapsedTime}s
              </p>
            </div>
            <div className="w-full max-w-md bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'success') {
    return (
      <Card className="max-w-2xl mx-auto border-2 border-green-200 bg-green-50">
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                Proposal Generated Successfully!
              </h3>
              <p className="text-gray-600 max-w-md">
                Your AI-powered proposal is ready. Redirecting to the editor where you can review and refine it...
              </p>
            </div>
            <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'error') {
    return (
      <Card className="max-w-2xl mx-auto border-2 border-red-200 bg-red-50">
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                Generation Failed
              </h3>
              <p className="text-red-600 max-w-md">
                {error || 'An unexpected error occurred while generating your proposal.'}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onBack}
              >
                Go Back
              </Button>
              <Button
                onClick={() => {
                  setStatus('idle');
                  setError(null);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            AI-Powered Proposal Generation
          </CardTitle>
          <p className="text-sm text-gray-500 mt-2">
            Select a meeting transcription and provide basic details. Our AI will analyze the conversation
            and generate a complete, professional proposal including executive summary, problem statement,
            proposed solution, scope, and timeline.
          </p>
        </CardHeader>
        <CardContent>
          <TranscriptionSelector
            clientId={clientId}
            selectedTranscriptionId={selectedTranscriptionId}
            onTranscriptionSelect={setSelectedTranscriptionId}
            onGenerate={handleGenerate}
            onCancel={onBack}
          />
        </CardContent>
      </Card>
    </div>
  );
}

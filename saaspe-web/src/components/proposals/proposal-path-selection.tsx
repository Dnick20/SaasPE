'use client';

import { Sparkles, FileText, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ProposalPathSelectionProps {
  clientId: string;
  onSelectPath: (path: 'transcription' | 'manual') => void;
}

export function ProposalPathSelection({ clientId, onSelectPath }: ProposalPathSelectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
      {/* AI-Assisted Path */}
      <Card className="relative overflow-hidden border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group">
        <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
          RECOMMENDED
        </div>
        <CardHeader className="space-y-4">
          <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
            <Sparkles className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-2xl mb-2">AI-Powered Generation</CardTitle>
            <CardDescription className="text-base">
              Let AI analyze your meeting transcription and generate a complete, professional proposal in seconds
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Automatic Content Generation</p>
                <p className="text-sm text-gray-500">Executive summary, problem statement, and solution automatically created</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Data Extraction</p>
                <p className="text-sm text-gray-500">Budget, timeline, and pain points pulled from transcription</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Fully Editable</p>
                <p className="text-sm text-gray-500">Review and refine the AI-generated content before sending</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Time Savings</p>
                <p className="text-sm text-gray-500">Generate in 30 seconds vs 2+ hours manual work</p>
              </div>
            </div>
          </div>

          <Button
            onClick={() => onSelectPath('transcription')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white group-hover:shadow-md transition-all"
            size="lg"
          >
            Generate with AI
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </CardContent>
      </Card>

      {/* Manual Path */}
      <Card className="relative overflow-hidden border-2 border-gray-200 hover:border-gray-400 hover:shadow-lg transition-all cursor-pointer group">
        <CardHeader className="space-y-4">
          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
            <FileText className="h-8 w-8 text-gray-600" />
          </div>
          <div>
            <CardTitle className="text-2xl mb-2">Manual Creation</CardTitle>
            <CardDescription className="text-base">
              Create your proposal from scratch with full control over every section and detail
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Complete Control</p>
                <p className="text-sm text-gray-500">Write every section exactly as you envision it</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">No Transcription Needed</p>
                <p className="text-sm text-gray-500">Perfect when you don't have a recorded meeting</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Flexible Sections</p>
                <p className="text-sm text-gray-500">Add, remove, or customize any section you need</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Best for Simple Proposals</p>
                <p className="text-sm text-gray-500">Quick and straightforward for familiar scenarios</p>
              </div>
            </div>
          </div>

          <Button
            onClick={() => onSelectPath('manual')}
            variant="outline"
            className="w-full border-2 border-gray-300 hover:bg-gray-50 group-hover:border-gray-400 transition-all"
            size="lg"
          >
            Create Manually
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

interface ScriptGenerationStepProps {
  data: {
    tone: string;
    ctas: string[];
    emailScript?: any;
    linkedInScript?: any;
    coldCallScript?: any;
  };
  onChange: (data: any) => void;
  onGenerateScripts: () => Promise<void>;
  isGenerating: boolean;
  hasGenerated: boolean;
}

export function ScriptGenerationStep({
  data,
  onChange,
  onGenerateScripts,
  isGenerating,
  hasGenerated,
}: ScriptGenerationStepProps) {
  const toneOptions = [
    { value: 'professional', label: 'Professional', description: 'Formal and business-focused' },
    { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
    { value: 'direct', label: 'Direct', description: 'Straight to the point' },
    { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
  ];

  const ctaOptions = [
    'Schedule a demo',
    'Download whitepaper',
    'Book a call',
    'Start free trial',
    'Request pricing',
    'Watch a video',
  ];

  const toggleCta = (cta: string) => {
    const ctas = data.ctas || [];
    if (ctas.includes(cta)) {
      onChange({ ...data, ctas: ctas.filter((c) => c !== cta) });
    } else {
      onChange({ ...data, ctas: [...ctas, cta] });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Generate Outreach Scripts</h2>
        <p className="text-gray-500 mt-1">
          Choose your communication style and we'll create personalized scripts for email, LinkedIn, and cold calling
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          <div>
            <Label className="text-base font-semibold">Communication Tone</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {toneOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange({ ...data, tone: option.value })}
                  className={`
                    p-4 rounded-lg border-2 text-left transition-all
                    ${
                      data.tone === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="font-semibold">{option.label}</div>
                  <div className="text-sm text-gray-500">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold">Call-to-Actions</Label>
            <p className="text-sm text-gray-500 mb-3">Select the CTAs you want to include</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {ctaOptions.map((cta) => (
                <button
                  key={cta}
                  type="button"
                  onClick={() => toggleCta(cta)}
                  className={`
                    px-4 py-2 rounded-md border text-sm transition-all
                    ${
                      data.ctas?.includes(cta)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  {cta}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t">
            {!hasGenerated ? (
              <Button
                type="button"
                onClick={onGenerateScripts}
                disabled={isGenerating || !data.tone || !data.ctas?.length}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Scripts with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Scripts with AI
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 text-green-600 py-4">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Scripts Generated Successfully!</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

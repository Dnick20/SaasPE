'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { companyProfileApi } from '@/lib/api/endpoints/company-profile';
import { Loader2, Sparkles } from 'lucide-react';

const companySchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  website: z.string().url('Please enter a valid website URL').optional().or(z.literal('')),
  industry: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CompanyProfileData {
  companyName: string;
  website?: string;
  industry?: string;
  [key: string]: unknown;
}

interface CompanyProfileStepProps {
  onComplete: (data: CompanyProfileData) => void;
  initialData?: Partial<CompanyProfileData>;
}

export function CompanyProfileStep({ onComplete, initialData }: CompanyProfileStepProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [enrichmentData, setEnrichmentData] = useState<Record<string, unknown> | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: initialData,
  });

  const website = watch('website');

  const handleAnalyzeWebsite = async () => {
    if (!website) return;

    setIsAnalyzing(true);
    try {
      const response = await companyProfileApi.analyzeWebsite(website);
      const data = response.data;
      setEnrichmentData(data as any);

      // Auto-fill industry if available
      if (data.industry && !watch('industry')) {
        setValue('industry', data.industry as string);
      }
    } catch (error) {
      console.error('Failed to analyze website:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onSubmit = (data: CompanyFormData) => {
    onComplete({
      ...data,
      enrichmentData,
    });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Welcome to SaasPE!</CardTitle>
        <CardDescription>
          Let's start by learning about your business
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              {...register('companyName')}
              placeholder="Acme Marketing Agency"
            />
            {errors.companyName && (
              <p className="text-sm text-red-600">{errors.companyName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Company Website</Label>
            <div className="flex gap-2">
              <Input
                id="website"
                type="url"
                {...register('website')}
                placeholder="https://www.acmeagency.com"
              />
              <Button
                type="button"
                onClick={handleAnalyzeWebsite}
                disabled={!website || isAnalyzing}
                className="gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
            {errors.website && (
              <p className="text-sm text-red-600">{errors.website.message}</p>
            )}
          </div>

          {enrichmentData && (
            <div className="p-4 bg-green-50 rounded-lg space-y-2">
              <p className="text-sm font-medium text-green-900">Website Analysis Complete!</p>
              <p className="text-sm text-green-700">{enrichmentData.description}</p>
              {enrichmentData.services && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {enrichmentData.services.map((service: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                      {service}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              {...register('industry')}
              placeholder="B2B SaaS, Marketing Agency, etc."
            />
          </div>

          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

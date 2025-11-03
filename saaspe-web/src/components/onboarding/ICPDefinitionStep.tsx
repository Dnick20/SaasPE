'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const icpSchema = z.object({
  targetICP: z.string().min(10, 'Please describe your ideal customer'),
  preferredTone: z.enum(['professional', 'friendly', 'consultative', 'casual']),
});

type ICPFormData = z.infer<typeof icpSchema>;

interface ICPDefinitionStepProps {
  onComplete: (data: ICPFormData) => void;
}

export function ICPDefinitionStep({ onComplete }: ICPDefinitionStepProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ICPFormData>({
    resolver: zodResolver(icpSchema),
    defaultValues: {
      preferredTone: 'professional',
    },
  });

  const selectedTone = watch('preferredTone');

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Define Your Ideal Customer</CardTitle>
        <CardDescription>
          This helps us personalize your proposals and email campaigns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onComplete)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="targetICP">Who is your ideal customer? *</Label>
            <Textarea
              id="targetICP"
              {...register('targetICP')}
              placeholder="e.g., Marketing directors at B2B SaaS companies with 50-200 employees who are struggling with lead generation"
              className="min-h-[100px]"
            />
            {errors.targetICP && (
              <p className="text-sm text-red-600">{errors.targetICP.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Be specific - include job title, company size, industry, and pain points
            </p>
          </div>

          <div className="space-y-3">
            <Label>Preferred Communication Tone</Label>
            <RadioGroup
              value={selectedTone}
              onValueChange={(value: string) => setValue('preferredTone', value as 'professional' | 'friendly' | 'consultative' | 'casual')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="professional" id="professional" />
                <Label htmlFor="professional" className="font-normal cursor-pointer">
                  Professional - Formal and business-focused
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="friendly" id="friendly" />
                <Label htmlFor="friendly" className="font-normal cursor-pointer">
                  Friendly - Warm and approachable
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="consultative" id="consultative" />
                <Label htmlFor="consultative" className="font-normal cursor-pointer">
                  Consultative - Expert and advisory
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="casual" id="casual" />
                <Label htmlFor="casual" className="font-normal cursor-pointer">
                  Casual - Relaxed and conversational
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button type="submit" className="w-full">
            Complete Discovery
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

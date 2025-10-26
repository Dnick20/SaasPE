'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, User, Globe } from 'lucide-react';

const userInfoSchema = z.object({
  fullName: z.string().min(2, 'Please enter your full name'),
  companyName: z.string().min(2, 'Please enter your company name'),
  companyWebsite: z.string().url('Please enter a valid website URL').optional().or(z.literal('')),
});

type UserInfoFormData = z.infer<typeof userInfoSchema>;

interface UserInfoStepProps {
  onComplete: (data: UserInfoFormData) => void;
  onBack?: () => void;
  initialData?: Partial<UserInfoFormData>;
}

export function UserInfoStep({ onComplete, onBack, initialData }: UserInfoStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserInfoFormData>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: initialData,
  });

  const onSubmit = async (data: UserInfoFormData) => {
    setIsSubmitting(true);
    // Simulate saving to backend (you can add API call here)
    setTimeout(() => {
      onComplete(data);
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to SaasPE! 👋</CardTitle>
          <CardDescription>
            Let's get to know you and your business before we connect your email accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                What's your name?
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                {...register('fullName')}
                disabled={isSubmitting}
                className="text-base"
              />
              {errors.fullName && (
                <p className="text-sm text-red-600">{errors.fullName.message}</p>
              )}
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName" className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-500" />
                What's your company name?
              </Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Acme Marketing Agency"
                {...register('companyName')}
                disabled={isSubmitting}
                className="text-base"
              />
              {errors.companyName && (
                <p className="text-sm text-red-600">{errors.companyName.message}</p>
              )}
            </div>

            {/* Company Website */}
            <div className="space-y-2">
              <Label htmlFor="companyWebsite" className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-500" />
                What's your company website? <span className="text-gray-400 text-sm">(Optional)</span>
              </Label>
              <Input
                id="companyWebsite"
                type="url"
                placeholder="https://www.acmeagency.com"
                {...register('companyWebsite')}
                disabled={isSubmitting}
                className="text-base"
              />
              {errors.companyWebsite && (
                <p className="text-sm text-red-600">{errors.companyWebsite.message}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              {onBack && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
              )}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="ml-auto"
              >
                {isSubmitting ? 'Saving...' : 'Continue'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

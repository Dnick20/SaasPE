'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';
import { handleApiError } from '@/lib/api/client';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, clearAuth } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      // Clear any existing auth state before logging in
      clearAuth();

      const response = await authApi.login(data);
      // Tokens are now stored in httpOnly cookies by backend
      // Only store user info in Zustand
      setAuth(response.user);

      // Check journey state to route appropriately
      try {
        const journeyResponse = await fetch('/api/v1/journey', {
          credentials: 'include',
        });

        if (journeyResponse.ok) {
          const journeyData = await journeyResponse.json();
          const currentStep = journeyData.currentStep || 'discovery';

          // Route based on journey progress
          if (currentStep === 'discovery') {
            // New user - trigger onboarding
            router.push('/dashboard?showOnboarding=true');
          } else if (currentStep === 'complete') {
            // Journey complete - go to regular dashboard
            router.push('/dashboard');
          } else {
            // Journey in progress - route to current step
            const stepRoutes: Record<string, string> = {
              client: '/dashboard/clients',
              proposal: '/dashboard/proposals',
              playbook: '/dashboard/playbooks',
              mailboxes: '/dashboard/integrations',
              warmup: '/dashboard/warmup',
              campaign: '/dashboard/campaigns',
            };
            router.push(stepRoutes[currentStep] || '/dashboard');
          }
        } else {
          // Journey API failed - default to dashboard
          router.push('/dashboard');
        }
      } catch (journeyErr) {
        console.error('Failed to check journey state:', journeyErr);
        // Fallback to dashboard on error
        router.push('/dashboard');
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-3xl font-bold">
            Welcome back
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to your SaasPE account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

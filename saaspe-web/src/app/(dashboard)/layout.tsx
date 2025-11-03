'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { JourneyProvider } from '@/lib/journey/journey-context';
import { JourneyProgress } from '@/components/journey/journey-progress';
import { DashboardLayout as DesignSystemDashboardLayout } from '@/components/layout/dashboard-layout';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    // Check authentication on mount
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Don't render dashboard if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <JourneyProvider userId={user.id}>
      <DesignSystemDashboardLayout>
        <JourneyProgress />
        {children}
      </DesignSystemDashboardLayout>
    </JourneyProvider>
  );
}

'use client';

/**
 * Error Tracking Provider
 *
 * Automatically tracks navigation, user context, and initializes error reporting
 */

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

interface ErrorTrackingProviderProps {
  children: React.ReactNode;
}

function NavigationTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track navigation changes safely
  useEffect(() => {
    try {
      import('@/lib/services/errorReporting').then(({ trackNavigation, updateAppState }) => {
        const params: Record<string, unknown> = {};
        searchParams.forEach((value, key) => {
          params[key] = value;
        });

        trackNavigation(pathname, Object.keys(params).length > 0 ? params : undefined);
        updateAppState(pathname, { searchParams: params });
      }).catch(() => {
        // Error reporting not available, skip tracking
      });
    } catch {
      // Error tracking not available
    }
  }, [pathname, searchParams]);

  return null;
}

function UserTracker() {
  const user = useAuthStore((state) => state.user);

  // Track user context changes safely
  useEffect(() => {
    try {
      import('@/lib/sentry').then(({ initializeUserTracking }) => {
        if (user) {
          initializeUserTracking({
            id: user.id,
            email: user.email,
            tenantId: user.tenantId,
            role: user.role,
          });
        } else {
          initializeUserTracking(null);
        }
      }).catch(() => {
        // Sentry not available, skip tracking
      });
    } catch {
      // Error tracking not available
    }
  }, [user]);

  return null;
}

export function ErrorTrackingProvider({ children }: ErrorTrackingProviderProps) {
  return (
    <>
      <UserTracker />
      <Suspense fallback={null}>
        <NavigationTracker />
      </Suspense>
      {children}
    </>
  );
}

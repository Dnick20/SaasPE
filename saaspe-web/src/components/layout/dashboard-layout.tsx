'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { DesignSystemSidebar } from '@/components/design-system/sidebar';
import { DesignSystemNavbar } from '@/components/design-system/navbar';

interface DashboardLayoutProps {
  children: ReactNode;
  breadcrumb?: string;
}

// Map routes to breadcrumb labels
const getBreadcrumbFromPath = (pathname: string): string => {
  const routeMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/dashboard/clients': 'Clients',
    '/dashboard/contacts': 'Contacts',
    '/dashboard/transcriptions': 'Transcriptions',
    '/dashboard/proposals': 'Proposals',
    '/dashboard/playbooks': 'Playbooks',
    '/dashboard/mailboxes': 'Email Accounts',
    '/dashboard/campaigns': 'Campaigns',
    '/dashboard/replies': 'Replies',
    '/dashboard/warmup': 'Warmup',
    '/dashboard/analytics': 'Analytics',
    '/dashboard/tokens': 'Tokens',
    '/dashboard/integrations': 'Integrations',
    '/dashboard/settings': 'Settings',
    '/dashboard/onboarding': 'Onboarding',
  };

  // Find matching route (exact match or starts with)
  for (const [route, label] of Object.entries(routeMap)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return label;
    }
  }

  return 'Dashboard';
};

export function DashboardLayout({ children, breadcrumb }: DashboardLayoutProps) {
  const pathname = usePathname();
  const breadcrumbLabel = breadcrumb || getBreadcrumbFromPath(pathname || '');

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DesignSystemSidebar />
      
      <main className="flex-1 ml-64 pt-16">
        <DesignSystemNavbar breadcrumb={breadcrumbLabel} />
        <div className="p-10">
          {children}
        </div>
      </main>
    </div>
  );
}


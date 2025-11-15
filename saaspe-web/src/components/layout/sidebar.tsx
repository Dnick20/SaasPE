'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Mic,
  FileText,
  Mail,
  Users,
  Settings,
  BarChart3,
  Plug,
  UserCircle,
  TrendingUp,
  Coins,
  Inbox,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomerJourney } from '@/lib/journey/use-customer-journey';
import { JourneyStep } from '@/lib/journey/types';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/dashboard/clients', icon: Users },
  { name: 'Contacts', href: '/dashboard/contacts', icon: UserCircle },
  { name: 'Transcriptions', href: '/dashboard/transcriptions', icon: Mic },
  { name: 'Proposals', href: '/dashboard/proposals', icon: FileText },
  { name: 'Playbooks', href: '/dashboard/playbooks', icon: BookOpen },
  { name: 'Email Accounts', href: '/dashboard/mailboxes', icon: Inbox },
  { name: 'Campaigns', href: '/dashboard/campaigns', icon: Mail },
  { name: 'Replies', href: '/dashboard/replies', icon: MessageSquare },
  { name: 'Warmup', href: '/dashboard/warmup', icon: TrendingUp },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Tokens', href: '/dashboard/tokens', icon: Coins },
  { name: 'Integrations', href: '/dashboard/integrations', icon: Plug },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const journey = useCustomerJourney();

  // Map routes to journey steps
  const getStepForRoute = (href: string): JourneyStep | null => {
    if (href.includes('/clients')) return 'client';
    if (href.includes('/proposals')) return 'proposal';
    if (href.includes('/playbooks')) return 'playbook';
    if (href.includes('/campaigns')) return 'campaign';
    if (href.includes('/mailboxes')) return 'mailboxes';
    if (href.includes('/warmup')) return 'warmup';
    return null;
  };

  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;
          const step = getStepForRoute(item.href);
          const isStepCompleted = step && journey.isStepComplete(step);
          const isCurrentStep = step && journey.currentStep === step;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'h-5 w-5 flex-shrink-0',
                    isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                  )}
                />
                {item.name}
              </div>
              {isStepCompleted && !journey.isComplete && (
                <span className="text-green-500 text-xs">✓</span>
              )}
              {isCurrentStep && !isStepCompleted && !journey.isComplete && (
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

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

export function DesignSystemSidebar() {
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
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-50 border-r border-slate-200 overflow-y-auto">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="px-3 py-4">
          <div className="text-xl font-bold text-blue-600">
            SaaSOPE
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 pb-4">
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
                  'flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-medium transition-all duration-200 mb-1',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 flex-shrink-0',
                    isActive ? 'opacity-100' : 'opacity-70'
                  )}
                />
                <span className="flex-1">{item.name}</span>
                {isStepCompleted && !journey.isComplete && (
                  <span className="text-emerald-600 text-xs">✓</span>
                )}
                {isCurrentStep && !isStepCompleted && !journey.isComplete && (
                  <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}


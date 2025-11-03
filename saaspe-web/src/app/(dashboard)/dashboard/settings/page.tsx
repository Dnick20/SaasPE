export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, FileSignature, ArrowRight, Building2, Palette } from 'lucide-react';

export default function SettingsPage() {
  const settingsSections = [
    {
      title: 'E-Signature Connections',
      description: 'Connect your e-signature provider accounts to send proposals',
      icon: FileSignature,
      href: '/dashboard/settings/e-signatures',
      available: true,
    },
    {
      title: 'Company Profile',
      description: 'Manage your company information and branding',
      icon: Building2,
      href: '/dashboard/settings/company',
      available: false,
    },
    {
      title: 'Branding & Templates',
      description: 'Customize your proposal templates and brand colors',
      icon: Palette,
      href: '/dashboard/settings/branding',
      available: false,
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {settingsSections.map((section) => {
          const Icon = section.icon;

          return (
            <Card key={section.href} className="hover:border-blue-300 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{section.title}</CardTitle>
                      <CardDescription className="mt-1">{section.description}</CardDescription>
                    </div>
                  </div>
                  {section.available ? (
                    <Link href={section.href}>
                      <Button>
                        Configure
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" disabled>
                      Coming Soon
                    </Button>
                  )}
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

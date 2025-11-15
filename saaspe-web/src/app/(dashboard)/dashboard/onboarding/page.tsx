'use client';


export const dynamic = 'force-dynamic';
import { DiscoveryWizard } from '@/components/onboarding/DiscoveryWizard';

export default function OnboardingPage() {
  return (
    <div className="container max-w-4xl py-8">
      <DiscoveryWizard />
    </div>
  );
}

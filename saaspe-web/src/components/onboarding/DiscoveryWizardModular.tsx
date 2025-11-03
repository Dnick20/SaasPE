'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CompanyProfileStep } from './CompanyProfileStep';
import { ICPDefinitionStep } from './ICPDefinitionStep';
import { useCustomerJourney } from '@/lib/journey/use-customer-journey';
import { companyProfileApi } from '@/lib/api/endpoints/company-profile';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

type DiscoveryStep = 'company' | 'icp';

/**
 * Modular Discovery Wizard
 *
 * Alternative implementation that uses separate step components
 * for better modularity and maintainability.
 */
export function DiscoveryWizardModular() {
  const router = useRouter();
  const { markStepComplete, goToNextStep } = useCustomerJourney();
  const [currentStep, setCurrentStep] = useState<DiscoveryStep>('company');
  const [companyData, setCompanyData] = useState<any>(null);

  const handleCompanyComplete = (data: any) => {
    setCompanyData(data);
    setCurrentStep('icp');
  };

  const handleICPComplete = async (icpData: any) => {
    try {
      // Create company profile with all data
      const profile = await companyProfileApi.create({
        ...companyData,
        ...icpData,
      });

      // Mark discovery step complete
      markStepComplete('discovery', {
        companyProfileId: profile.data.id,
        companyName: companyData.companyName,
        website: companyData.website,
        industry: companyData.industry,
        targetICP: icpData.targetICP,
        preferredTone: icpData.preferredTone,
      });

      // Navigate to next step
      goToNextStep();
    } catch (error) {
      console.error('Failed to complete discovery:', error);
      alert('Failed to save company profile. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        <div className={`h-2 w-24 rounded-full ${currentStep === 'company' ? 'bg-blue-600' : 'bg-green-500'}`} />
        <div className={`h-2 w-24 rounded-full ${currentStep === 'icp' ? 'bg-blue-600' : 'bg-gray-200'}`} />
      </div>

      {/* Back button */}
      {currentStep === 'icp' && (
        <Button
          variant="ghost"
          onClick={() => setCurrentStep('company')}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
      )}

      {/* Steps */}
      {currentStep === 'company' && (
        <CompanyProfileStep onComplete={handleCompanyComplete} initialData={companyData} />
      )}
      {currentStep === 'icp' && (
        <ICPDefinitionStep onComplete={handleICPComplete} />
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCustomerJourney } from '@/lib/journey/use-customer-journey';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface DiscoveryFormData {
  companyName: string;
  website: string;
  industry: string;
  targetICP: string;
  preferredTone: string;
}

type Step = 1 | 2 | 3 | 4;

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional & Formal' },
  { value: 'friendly', label: 'Friendly & Conversational' },
  { value: 'consultative', label: 'Consultative & Advisory' },
  { value: 'casual', label: 'Casual & Relaxed' },
];

const INDUSTRY_OPTIONS = [
  'Technology/SaaS',
  'Marketing/Advertising',
  'Consulting',
  'E-commerce',
  'Healthcare',
  'Finance',
  'Real Estate',
  'Manufacturing',
  'Education',
  'Other',
];

/**
 * Discovery Wizard
 *
 * Multi-step form for collecting company profile and ICP information.
 * Results are used to:
 * - Pre-fill proposal templates
 * - Set campaign tone/style defaults
 * - Enrich company data via website scraping
 */
export function DiscoveryWizard() {
  const router = useRouter();
  const journey = useCustomerJourney();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<DiscoveryFormData>({
    companyName: journey.metadata.companyName || '',
    website: journey.metadata.website || '',
    industry: journey.metadata.industry || '',
    targetICP: journey.metadata.targetICP || '',
    preferredTone: journey.metadata.preferredTone || 'professional',
  });

  const updateField = (field: keyof DiscoveryFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const goToNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      // Use relative URL so cookies are sent (same-origin request)
      // Try to create company profile
      let response = await fetch('/api/v1/company-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      // If profile already exists (409 Conflict), update it instead
      if (response.status === 409) {
        console.log('Company profile exists, updating instead...');
        response = await fetch('/api/v1/company-profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to save company profile:', response.status, errorText);
        throw new Error('Failed to save company profile');
      }

      const profile = await response.json();
      console.log('Company profile saved:', profile);

      // Update journey metadata
      journey.markStepComplete('discovery', {
        companyProfileId: profile.id,
        companyName: formData.companyName,
        website: formData.website,
        industry: formData.industry,
        targetICP: formData.targetICP,
        preferredTone: formData.preferredTone,
      });

      // Navigate to next step
      journey.goToNextStep();
    } catch (error) {
      console.error('Discovery wizard error:', error);
      alert('Failed to save company profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.companyName.trim().length > 0;
      case 2:
        return formData.website.trim().length > 0;
      case 3:
        return formData.industry.length > 0;
      case 4:
        return formData.targetICP.trim().length > 0 && formData.preferredTone.length > 0;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-2xl">Welcome to SaasPE! 🎉</CardTitle>
              <CardDescription>
                Let's get to know your business (Step {currentStep} of 4)
              </CardDescription>
            </div>
            <div className="text-sm text-gray-500">
              {Math.round((currentStep / 4) * 100)}% Complete
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full ${
                  step <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Company Name */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <span className="text-6xl">🏢</span>
                <h3 className="text-xl font-semibold mt-4">What's your company name?</h3>
                <p className="text-gray-600 mt-2">
                  This will be used across proposals and campaigns
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="e.g., Acme Marketing Agency"
                  value={formData.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  className="text-lg"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step 2: Website */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <span className="text-6xl">🌐</span>
                <h3 className="text-xl font-semibold mt-4">What's your website?</h3>
                <p className="text-gray-600 mt-2">
                  We'll use this to enrich your company profile
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="e.g., https://acmeagency.com"
                  value={formData.website}
                  onChange={(e) => updateField('website', e.target.value)}
                  className="text-lg"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step 3: Industry */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <span className="text-6xl">🏭</span>
                <h3 className="text-xl font-semibold mt-4">What industry are you in?</h3>
                <p className="text-gray-600 mt-2">
                  This helps us tailor proposals for your market
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select value={formData.industry} onValueChange={(value) => updateField('industry', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 4: ICP and Tone */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <span className="text-6xl">🎯</span>
                <h3 className="text-xl font-semibold mt-4">Who's your ideal customer?</h3>
                <p className="text-gray-600 mt-2">
                  Define your target audience and preferred communication style
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetICP">Ideal Customer Profile (ICP)</Label>
                <Textarea
                  id="targetICP"
                  placeholder="e.g., B2B SaaS founders with 10-50 employees looking to scale their sales outreach"
                  value={formData.targetICP}
                  onChange={(e) => updateField('targetICP', e.target.value)}
                  rows={4}
                  autoFocus
                />
                <p className="text-sm text-gray-500">
                  Be specific about company size, industry, role, and pain points
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredTone">Preferred Communication Tone</Label>
                <Select value={formData.preferredTone} onValueChange={(value) => updateField('preferredTone', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  This will be the default tone for your campaigns and proposals
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={goToPreviousStep}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            {currentStep < 4 ? (
              <Button
                onClick={goToNextStep}
                disabled={!isStepValid()}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!isStepValid() || isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Setup
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

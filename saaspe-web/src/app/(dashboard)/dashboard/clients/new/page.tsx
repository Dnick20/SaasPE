'use client';


export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateClient } from '@/lib/hooks/useClients';
import { useCustomerJourney } from '@/lib/journey/use-customer-journey';
import { toast } from 'sonner';
import type { CreateClientDto } from '@/lib/api/endpoints/clients';
import { AxiosError } from 'axios';

export default function NewClientPage() {
  const router = useRouter();
  const createMutation = useCreateClient();
  const journey = useCustomerJourney();

  const [formData, setFormData] = useState<CreateClientDto>({
    companyName: '',
    industry: '',
    website: '',
    contactFirstName: '',
    contactLastName: '',
    contactEmail: '',
    contactPhone: '',
    contactLinkedIn: '',
    problemStatement: '',
    currentTools: [],
    budget: '',
    timeline: '',
    hubspotDealId: '',
    status: 'prospect',
  });

  const [toolsInput, setToolsInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName) {
      toast.error('Company name is required');
      return;
    }

    // Convert tools string to array
    const tools = toolsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const submitData = {
      ...formData,
      currentTools: tools.length > 0 ? tools : undefined,
      // Remove empty strings
      industry: formData.industry || undefined,
      website: formData.website || undefined,
      contactFirstName: formData.contactFirstName || undefined,
      contactLastName: formData.contactLastName || undefined,
      contactEmail: formData.contactEmail || undefined,
      contactPhone: formData.contactPhone || undefined,
      contactLinkedIn: formData.contactLinkedIn || undefined,
      problemStatement: formData.problemStatement || undefined,
      budget: formData.budget || undefined,
      timeline: formData.timeline || undefined,
      hubspotDealId: formData.hubspotDealId || undefined,
    };

    createMutation.mutate(submitData, {
      onSuccess: (data) => {
        toast.success('Client created successfully');

        // Mark journey step complete if this is their first client
        if (journey.currentStep === 'client' && !journey.isStepComplete('client')) {
          journey.markStepComplete('client', {
            firstClientId: data.id,
            firstClientName: data.companyName,
          });
        }

        router.push(`/dashboard/clients/${data.id}`);
      },
      onError: (error) => {
        const message = error instanceof AxiosError
          ? error.response?.data?.message || 'Failed to create client'
          : 'Failed to create client';
        toast.error(message);
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/clients')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Client</h1>
          <p className="text-gray-500 mt-1">Create a new client record</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="companyName">
                  Company Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                  placeholder="Acme Corporation"
                  required
                />
              </div>

              <div>
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) =>
                    setFormData({ ...formData, industry: e.target.value })
                  }
                  placeholder="Technology, Healthcare, etc."
                />
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <Label htmlFor="budget">Budget</Label>
                <Input
                  id="budget"
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData({ ...formData, budget: e.target.value })
                  }
                  placeholder="$50k - $100k"
                />
              </div>

              <div>
                <Label htmlFor="timeline">Timeline</Label>
                <Input
                  id="timeline"
                  value={formData.timeline}
                  onChange={(e) =>
                    setFormData({ ...formData, timeline: e.target.value })
                  }
                  placeholder="3-6 months"
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="prospect">Prospect</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>

              <div>
                <Label htmlFor="hubspotDealId">HubSpot Deal ID</Label>
                <Input
                  id="hubspotDealId"
                  value={formData.hubspotDealId}
                  onChange={(e) =>
                    setFormData({ ...formData, hubspotDealId: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactFirstName">First Name</Label>
                <Input
                  id="contactFirstName"
                  value={formData.contactFirstName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contactFirstName: e.target.value,
                    })
                  }
                  placeholder="John"
                />
              </div>

              <div>
                <Label htmlFor="contactLastName">Last Name</Label>
                <Input
                  id="contactLastName"
                  value={formData.contactLastName}
                  onChange={(e) =>
                    setFormData({ ...formData, contactLastName: e.target.value })
                  }
                  placeholder="Doe"
                />
              </div>

              <div>
                <Label htmlFor="contactEmail">Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, contactEmail: e.target.value })
                  }
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <Label htmlFor="contactPhone">Phone</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPhone: e.target.value })
                  }
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="contactLinkedIn">LinkedIn URL</Label>
                <Input
                  id="contactLinkedIn"
                  type="url"
                  value={formData.contactLinkedIn}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contactLinkedIn: e.target.value,
                    })
                  }
                  placeholder="https://linkedin.com/in/johndoe"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Details */}
        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="problemStatement">Problem Statement</Label>
              <Textarea
                id="problemStatement"
                value={formData.problemStatement}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    problemStatement: e.target.value,
                  })
                }
                placeholder="Describe the client's business challenge or pain point..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="currentTools">
                Current Tools & Systems
                <span className="text-sm text-gray-500 ml-2">(comma-separated)</span>
              </Label>
              <Input
                id="currentTools"
                value={toolsInput}
                onChange={(e) => setToolsInput(e.target.value)}
                placeholder="Salesforce, HubSpot, Slack, etc."
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/clients')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              'Create Client'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

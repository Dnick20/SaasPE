import React, { useState } from 'react';
import { useProvisionDomain } from '@/lib/hooks/useDomains';

interface EmailWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (domainId?: string) => void;
}

export function EmailWizard({ open, onClose, onSuccess }: EmailWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [domain, setDomain] = useState('');
  const [purchase, setPurchase] = useState(true);
  const [trackingSub, setTrackingSub] = useState('track');
  const [returnPathSub, setReturnPathSub] = useState('returnpath');
  const provision = useProvisionDomain();

  if (!open) return null;

  const handleProvision = async () => {
    await provision.mutateAsync({
      domain,
      purchase,
      trackingSubdomain: trackingSub,
      returnPathSubdomain: returnPathSub,
      dmarcPolicy: 'none',
    });
    setStep(3);
    onSuccess?.();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Connect a Managed Mailbox</h2>
          <button onClick={onClose}>×</button>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Use existing domain or buy new?</label>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={purchase} onChange={() => setPurchase(true)} />
                  Buy a new domain for me
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={!purchase} onChange={() => setPurchase(false)} />
                  Use my existing domain
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Domain</label>
              <input className="mt-1 w-full border rounded px-3 py-2" placeholder="example.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Tracking subdomain</label>
                <input className="mt-1 w-full border rounded px-3 py-2" value={trackingSub} onChange={(e) => setTrackingSub(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Return-Path subdomain</label>
                <input className="mt-1 w-full border rounded px-3 py-2" value={returnPathSub} onChange={(e) => setReturnPathSub(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2" onClick={onClose}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={() => setStep(2)}>Continue</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p>We will {purchase ? 'purchase' : 'configure'} {domain} and set up SPF, DKIM, DMARC, custom MAIL FROM, and tracking CNAME automatically via Cloudflare and SES.</p>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2" onClick={() => setStep(1)}>Back</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleProvision} disabled={provision.isPending}>
                {provision.isPending ? 'Provisioning…' : 'Provision Domain'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-medium">Domain Provisioned</h3>
            <p>DNS records created. SES verification may take a few minutes to complete.</p>
            <div className="flex justify-end">
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



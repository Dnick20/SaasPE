import React, { useState } from 'react';
import { providersApi } from '@/lib/api/providers';
import { useQueryClient } from '@tanstack/react-query';

interface BuyMailboxDialogProps {
  open: boolean;
  onClose: () => void;
  onPurchased?: (email: string) => void;
}

export function BuyMailboxDialog({ open, onClose, onPurchased }: BuyMailboxDialogProps) {
  const [provider, setProvider] = useState<'titan' | 'zoho' | 'workmail' | 'ses_managed'>('ses_managed');
  const [domain, setDomain] = useState('');
  const [localPart, setLocalPart] = useState('sales');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const qc = useQueryClient();
  const purchase = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await providersApi.purchaseMailbox({ provider, domain, localPart });
      await qc.invalidateQueries({ queryKey: ['mailboxes'] });
      onPurchased?.(`${localPart}@${domain}`);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to purchase mailbox');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Buy a Mailbox</h3>
          <button onClick={onClose}>×</button>
        </div>

        <div>
          <label className="block text-sm font-medium">Provider</label>
          <select className="mt-1 w-full border rounded px-3 py-2" value={provider} onChange={(e) => setProvider(e.target.value as any)}>
            <option value="ses_managed">Managed (AWS SES - send only)</option>
            <option value="titan">Titan Email (IMAP)</option>
            <option value="zoho">Zoho Mail (IMAP)</option>
            <option value="workmail">AWS WorkMail (IMAP)</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2 items-end">
          <div>
            <label className="block text-sm font-medium">Local part</label>
            <input className="mt-1 w-full border rounded px-3 py-2" value={localPart} onChange={(e) => setLocalPart(e.target.value)} />
          </div>
          <div className="text-center pb-2">@</div>
          <div>
            <label className="block text-sm font-medium">Domain</label>
            <input className="mt-1 w-full border rounded px-3 py-2" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button className="px-4 py-2" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={purchase} disabled={loading}>
            {loading ? 'Purchasing…' : 'Purchase'}
          </button>
        </div>
      </div>
    </div>
  );
}



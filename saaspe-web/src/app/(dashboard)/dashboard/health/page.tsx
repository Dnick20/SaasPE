'use client';

import useSWR from 'swr';
import { apiClient } from '@/lib/api/client';

const fetcher = (url: string) => apiClient.get(url).then(r => r.data);

export default function HealthPage() {
  const { data, isLoading, error } = useSWR('/api/v1/mailboxes?page=1&limit=100', fetcher);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Mailbox & Domain Health</h1>
      {isLoading && <p>Loading...</p>}
      {error && <p className="text-red-600">Failed to load: {String(error)}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.mailboxes?.map((m: any) => (
          <div key={m.id} className="border rounded p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{m.email}</p>
                <p className="text-xs text-gray-500">Status: {m.status}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{Math.round((m.healthScore || 0))}</p>
                <p className="text-xs text-gray-500">Health</p>
              </div>
            </div>
            <div className="text-xs text-gray-600">
              <p>Bounce rate: {(m.bounceRate * 100).toFixed(2)}%</p>
              <p>Complaint rate: {(m.complaintRate * 100).toFixed(2)}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



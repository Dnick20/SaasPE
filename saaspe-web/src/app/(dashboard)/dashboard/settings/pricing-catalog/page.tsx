'use client';

import { useEffect, useState } from 'react';
import { pricingCatalogApi, PricingCatalogItem } from '@/lib/api/endpoints/pricingCatalog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2 } from 'lucide-react';

export default function PricingCatalogSettingsPage() {
  const [items, setItems] = useState<PricingCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<PricingCatalogItem, 'id'>>({
    name: '',
    description: '',
    type: 'recurring',
    unitPrice: 0,
    billingPeriod: 'monthly',
    taxPct: 0,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await pricingCatalogApi.list();
        setItems(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const addItem = async () => {
    try {
      setSaving(true);
      const created = await pricingCatalogApi.add(form);
      setItems((prev) => [created, ...prev]);
      setForm({ name: '', description: '', type: 'recurring', unitPrice: 0, billingPeriod: 'monthly', taxPct: 0 });
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (id: string) => {
    await pricingCatalogApi.remove(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pricing Catalog</h1>
        <p className="text-gray-500 mt-1">Manage reusable pricing items for proposals.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Item</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., SEO Retainer" />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recurring">recurring</SelectItem>
                <SelectItem value="one-time">one-time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Unit Price</Label>
            <Input type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Billing</Label>
            <Select value={form.billingPeriod} onValueChange={(v) => setForm({ ...form, billingPeriod: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">monthly</SelectItem>
                <SelectItem value="yearly">yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tax %</Label>
            <Input type="number" step="0.01" value={form.taxPct ?? 0} onChange={(e) => setForm({ ...form, taxPct: Number(e.target.value) })} />
          </div>
          <div className="md:col-span-5">
            <Button onClick={addItem} disabled={saving || !form.name} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add to Catalog
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && <p className="text-sm text-gray-500">No items yet.</p>}
          {items.map((item) => (
            <div key={item.id} className="p-3 border rounded flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-medium">{item.name} <span className="text-gray-500 text-sm">({item.type})</span></div>
                <div className="text-sm text-gray-600">${item.unitPrice.toFixed(2)} {item.billingPeriod ? `/${item.billingPeriod}` : ''}</div>
                {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}



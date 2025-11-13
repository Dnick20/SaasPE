'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { DeliverableItem } from '@/types/proposal';
import { validateDeliverable } from '@/utils/proposal-normalizers';

interface DeliverablesBuilderProps {
  value: DeliverableItem[];
  onChange: (items: DeliverableItem[]) => void;
}

export function DeliverablesBuilder({ value, onChange }: DeliverablesBuilderProps) {
  const [items, setItems] = useState<DeliverableItem[]>(value || []);

  // Sync with prop changes (for AI regeneration)
  useEffect(() => {
    setItems(value || []);
  }, [value]);

  const updateItems = (nextItems: DeliverableItem[]) => {
    setItems(nextItems);
    onChange(nextItems);
  };

  const addItem = () => {
    const newItem: DeliverableItem = {
      name: '',
      description: '',
    };
    updateItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    updateItems(items.filter((_, i) => i !== index));
  };

  const updateField = (
    index: number,
    field: keyof DeliverableItem,
    value: string
  ) => {
    const nextItems = [...items];
    nextItems[index] = { ...nextItems[index], [field]: value };
    updateItems(nextItems);
  };

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">
            No deliverables defined yet
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Add deliverables to specify what will be provided to the client
          </p>
          <Button onClick={addItem} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add First Deliverable
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">
          Define what will be delivered to the client
        </p>
        <Button onClick={addItem} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Deliverable
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => {
          const error = validateDeliverable(item);

          return (
            <div
              key={index}
              className="rounded-lg border border-gray-200 p-4 space-y-3"
            >
              {/* Header Row: Number + Delete */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-sm font-semibold text-gray-500 shrink-0">
                    {index + 1}.
                  </span>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`deliverable-${index}-name`} className="text-sm font-medium">
                      Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`deliverable-${index}-name`}
                      value={item.name}
                      onChange={(e) => updateField(index, 'name', e.target.value)}
                      placeholder="e.g., Cleaned Data Files"
                      className={error ? 'border-red-300' : ''}
                    />
                    {error && (
                      <p className="text-xs text-red-600">{error}</p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => removeItem(index)}
                  variant="ghost"
                  size="icon"
                  className="shrink-0 mt-6"
                >
                  <Trash2 className="h-4 w-4 text-gray-500" />
                </Button>
              </div>

              {/* Description (Optional) */}
              <div className="ml-8 space-y-1">
                <Label htmlFor={`deliverable-${index}-description`} className="text-xs font-medium text-gray-600">
                  Description (optional)
                </Label>
                <Textarea
                  id={`deliverable-${index}-description`}
                  value={item.description || ''}
                  onChange={(e) => updateField(index, 'description', e.target.value)}
                  placeholder="Additional details about this deliverable..."
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="text-xs text-gray-500 text-center pt-2">
        {items.length} deliverable{items.length === 1 ? '' : 's'} defined
        {items.some((item) => validateDeliverable(item)) && (
          <span className="text-red-600 ml-2">• Some items need attention</span>
        )}
      </div>
    </div>
  );
}

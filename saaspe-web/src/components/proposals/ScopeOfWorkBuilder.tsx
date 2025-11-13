'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ScopeOfWorkItem } from '@/types/proposal';
import { validateScopeItem } from '@/utils/proposal-normalizers';

interface ScopeOfWorkBuilderProps {
  value: ScopeOfWorkItem[];
  onChange: (items: ScopeOfWorkItem[]) => void;
}

export function ScopeOfWorkBuilder({ value, onChange }: ScopeOfWorkBuilderProps) {
  const [items, setItems] = useState<ScopeOfWorkItem[]>(value || []);

  // Sync with prop changes (for AI regeneration)
  useEffect(() => {
    setItems(value || []);
  }, [value]);

  const updateItems = (nextItems: ScopeOfWorkItem[]) => {
    setItems(nextItems);
    onChange(nextItems);
  };

  const addItem = () => {
    const newItem: ScopeOfWorkItem = {
      title: '',
      objective: '',
      keyActivities: [],
      outcome: '',
    };
    updateItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    updateItems(items.filter((_, i) => i !== index));
  };

  const updateField = (
    index: number,
    field: keyof ScopeOfWorkItem,
    value: string | string[]
  ) => {
    const nextItems = [...items];
    nextItems[index] = { ...nextItems[index], [field]: value };
    updateItems(nextItems);
  };

  const addActivity = (itemIndex: number) => {
    const nextItems = [...items];
    const currentActivities = nextItems[itemIndex].keyActivities || [];
    nextItems[itemIndex] = {
      ...nextItems[itemIndex],
      keyActivities: [...currentActivities, ''],
    };
    updateItems(nextItems);
  };

  const removeActivity = (itemIndex: number, activityIndex: number) => {
    const nextItems = [...items];
    const currentActivities = nextItems[itemIndex].keyActivities || [];
    nextItems[itemIndex] = {
      ...nextItems[itemIndex],
      keyActivities: currentActivities.filter((_, i) => i !== activityIndex),
    };
    updateItems(nextItems);
  };

  const updateActivity = (itemIndex: number, activityIndex: number, value: string) => {
    const nextItems = [...items];
    const currentActivities = [...(nextItems[itemIndex].keyActivities || [])];
    currentActivities[activityIndex] = value;
    nextItems[itemIndex] = {
      ...nextItems[itemIndex],
      keyActivities: currentActivities,
    };
    updateItems(nextItems);
  };

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <ListChecks className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">
            No work items defined yet
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Add work items to define the scope of this project
          </p>
          <Button onClick={addItem} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add First Item
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">
          Define work items with objectives and key activities
        </p>
        <Button onClick={addItem} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      </div>

      {items.map((item, itemIndex) => {
        const error = validateScopeItem(item);

        return (
          <div
            key={itemIndex}
            className="rounded-lg border border-gray-200 p-4 space-y-4 border-l-4 border-l-green-500"
          >
            {/* Header: Title + Delete Button */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor={`item-${itemIndex}-title`} className="text-sm font-medium">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`item-${itemIndex}-title`}
                  value={item.title}
                  onChange={(e) => updateField(itemIndex, 'title', e.target.value)}
                  placeholder="e.g., Data Audit and Analysis"
                  className={error ? 'border-red-300' : ''}
                />
                {error && (
                  <p className="text-xs text-red-600">{error}</p>
                )}
              </div>
              <Button
                onClick={() => removeItem(itemIndex)}
                variant="outline"
                size="icon"
                className="mt-6 shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Objective */}
            <div className="space-y-1">
              <Label htmlFor={`item-${itemIndex}-objective`} className="text-sm font-medium">
                Objective
              </Label>
              <Textarea
                id={`item-${itemIndex}-objective`}
                value={item.objective || ''}
                onChange={(e) => updateField(itemIndex, 'objective', e.target.value)}
                placeholder="What this work item aims to achieve..."
                rows={2}
              />
            </div>

            {/* Key Activities */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Key Activities</Label>
                <Button
                  onClick={() => addActivity(itemIndex)}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Activity
                </Button>
              </div>

              {(!item.keyActivities || item.keyActivities.length === 0) && (
                <p className="text-xs text-gray-500 italic">
                  No activities added yet
                </p>
              )}

              <div className="space-y-2">
                {(item.keyActivities || []).map((activity, activityIndex) => (
                  <div key={activityIndex} className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm shrink-0">•</span>
                    <Input
                      value={activity}
                      onChange={(e) =>
                        updateActivity(itemIndex, activityIndex, e.target.value)
                      }
                      placeholder="e.g., Extract and review existing data"
                      className="flex-1"
                    />
                    <Button
                      onClick={() => removeActivity(itemIndex, activityIndex)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                    >
                      <Trash2 className="h-3 w-3 text-gray-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Outcome */}
            <div className="space-y-1">
              <Label htmlFor={`item-${itemIndex}-outcome`} className="text-sm font-medium">
                Outcome
              </Label>
              <Textarea
                id={`item-${itemIndex}-outcome`}
                value={item.outcome || ''}
                onChange={(e) => updateField(itemIndex, 'outcome', e.target.value)}
                placeholder="Expected result of this work item..."
                rows={2}
              />
            </div>
          </div>
        );
      })}

      {/* Summary */}
      <div className="text-xs text-gray-500 text-center pt-2">
        {items.length} work {items.length === 1 ? 'item' : 'items'} defined
        {items.some((item) => validateScopeItem(item)) && (
          <span className="text-red-600 ml-2">• Some items need attention</span>
        )}
      </div>
    </div>
  );
}

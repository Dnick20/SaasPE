'use client';

import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PricingItem {
  name: string;
  description?: string;
  price: number;
}

interface PricingOption {
  name: string;
  description?: string;
  items: PricingItem[];
  total: number;
  recommended?: boolean;
}

interface PricingOptionsBuilderProps {
  options: PricingOption[];
  onChange: (options: PricingOption[]) => void;
}

export function PricingOptionsBuilder({ options, onChange }: PricingOptionsBuilderProps) {
  const [editingOption, setEditingOption] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<{ optionIndex: number; itemIndex: number } | null>(null);

  const addOption = () => {
    const newOption: PricingOption = {
      name: `Option ${String.fromCharCode(65 + options.length)}`, // A, B, C...
      description: '',
      items: [{ name: '', description: '', price: 0 }],
      total: 0,
    };
    onChange([...options, newOption]);
    setEditingOption(options.length);
  };

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    onChange(newOptions);
  };

  const updateOption = (index: number, field: keyof PricingOption, value: any) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    onChange(newOptions);
  };

  const addItem = (optionIndex: number) => {
    const newOptions = [...options];
    newOptions[optionIndex].items.push({ name: '', description: '', price: 0 });
    onChange(newOptions);
  };

  const removeItem = (optionIndex: number, itemIndex: number) => {
    const newOptions = [...options];
    newOptions[optionIndex].items = newOptions[optionIndex].items.filter((_, i) => i !== itemIndex);

    // Recalculate total
    newOptions[optionIndex].total = newOptions[optionIndex].items.reduce(
      (sum, item) => sum + (item.price || 0),
      0
    );

    onChange(newOptions);
  };

  const updateItem = (optionIndex: number, itemIndex: number, field: keyof PricingItem, value: any) => {
    const newOptions = [...options];
    newOptions[optionIndex].items[itemIndex] = {
      ...newOptions[optionIndex].items[itemIndex],
      [field]: field === 'price' ? parseFloat(value) || 0 : value,
    };

    // Recalculate total
    newOptions[optionIndex].total = newOptions[optionIndex].items.reduce(
      (sum, item) => sum + (item.price || 0),
      0
    );

    onChange(newOptions);
  };

  if (options.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
          <Plus className="h-8 w-8 text-gray-400" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Pricing Options Yet
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
            Create multiple pricing options (like Option A vs Option B) to give your client choices.
            Each option can have different services and pricing.
          </p>
          <Button onClick={addOption} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add First Pricing Option
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Pricing Options</h3>
          <p className="text-sm text-gray-500">
            Create multiple pricing tiers to give your client flexibility
          </p>
        </div>
        <Button onClick={addOption} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Option
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {options.map((option, optionIndex) => (
          <Card key={optionIndex} className={`border-2 ${option.recommended ? 'border-blue-400' : 'border-gray-200'}`}>
            <CardHeader className="bg-gray-50 border-b">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {editingOption === optionIndex ? (
                    <div className="space-y-2">
                      <Input
                        value={option.name}
                        onChange={(e) => updateOption(optionIndex, 'name', e.target.value)}
                        placeholder="Option name (e.g., Option A)"
                        className="font-semibold"
                      />
                      <Input
                        value={option.description || ''}
                        onChange={(e) => updateOption(optionIndex, 'description', e.target.value)}
                        placeholder="Brief description (optional)"
                        className="text-sm"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingOption(null)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Done
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        {option.name}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingOption(optionIndex)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        {option.recommended && (
                          <span className="ml-1 inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">Recommended</span>
                        )}
                      </CardTitle>
                      {option.description && (
                        <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                      )}
                    </div>
                  )}
                </div>
                {options.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeOption(optionIndex)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">Mark as recommended option</div>
                  <Button
                    type="button"
                    size="sm"
                    variant={option.recommended ? 'default' : 'outline'}
                    onClick={() => {
                      const next = options.map((opt, i) => ({ ...opt, recommended: i === optionIndex }));
                      onChange(next);
                    }}
                  >
                    {option.recommended ? 'Recommended' : 'Set Recommended'}
                  </Button>
                </div>

                {option.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={item.name}
                          onChange={(e) => updateItem(optionIndex, itemIndex, 'name', e.target.value)}
                          placeholder="Service name"
                          className="text-sm font-medium"
                        />
                        <Input
                          value={item.description || ''}
                          onChange={(e) => updateItem(optionIndex, itemIndex, 'description', e.target.value)}
                          placeholder="Description (optional)"
                          className="text-xs"
                        />
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-gray-500">$</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => updateItem(optionIndex, itemIndex, 'price', e.target.value)}
                            placeholder="0.00"
                            className="text-sm font-semibold"
                          />
                        </div>
                      </div>
                      {option.items.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(optionIndex, itemIndex)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addItem(optionIndex)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>

                <div className="pt-3 border-t-2 border-gray-300">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Total Investment</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ${option.total.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {options.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Plus className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 mb-1">
                  Multiple Pricing Options
                </h4>
                <p className="text-sm text-blue-700 mb-3">
                  Offering multiple options increases your chances of closing the deal.
                  Clients appreciate having choices that fit different budgets and needs.
                </p>
                {options.length < 3 && (
                  <Button
                    onClick={addOption}
                    size="sm"
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Option
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

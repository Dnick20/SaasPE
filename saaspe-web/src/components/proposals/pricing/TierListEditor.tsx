'use client';

import { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export interface PricingTier {
  id?: string;
  name: string;
  description: string;
  amount: number;
  features: string[];
  sortOrder?: number;
}

interface TierListEditorProps {
  tiers: PricingTier[];
  onChange: (tiers: PricingTier[]) => void;
  readonly?: boolean;
  currency?: string;
}

export function TierListEditor({
  tiers,
  onChange,
  readonly = false,
  currency = 'USD',
}: TierListEditorProps) {
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [isAddingTier, setIsAddingTier] = useState(false);
  const [editingFeatureTierId, setEditingFeatureTierId] = useState<string | null>(null);
  const [newFeatureText, setNewFeatureText] = useState('');

  // New tier state
  const [newTier, setNewTier] = useState<PricingTier>({
    name: '',
    description: '',
    amount: 0,
    features: [],
  });

  // Editing tier state
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);

  const generateTierId = () => `tier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleAddTier = () => {
    if (!newTier.name.trim()) {
      alert('Tier name is required');
      return;
    }
    if (!newTier.description.trim() || newTier.description.length < 20) {
      alert('Tier description must be at least 20 characters');
      return;
    }
    if (newTier.features.length === 0) {
      alert('Please add at least one feature to the tier');
      return;
    }

    const tierWithId = {
      ...newTier,
      id: generateTierId(),
      sortOrder: tiers.length,
    };

    onChange([...tiers, tierWithId]);
    setNewTier({ name: '', description: '', amount: 0, features: [] });
    setIsAddingTier(false);
  };

  const handleUpdateTier = () => {
    if (!editingTier) return;

    if (!editingTier.name.trim()) {
      alert('Tier name is required');
      return;
    }
    if (!editingTier.description.trim() || editingTier.description.length < 20) {
      alert('Tier description must be at least 20 characters');
      return;
    }

    const updatedTiers = tiers.map((tier) =>
      tier.id === editingTier.id ? editingTier : tier
    );
    onChange(updatedTiers);
    setEditingTier(null);
    setEditingTierId(null);
  };

  const handleDeleteTier = (tierId: string) => {
    const updatedTiers = tiers.filter((tier) => tier.id !== tierId);
    onChange(updatedTiers);
  };

  const handleMoveTier = (tierId: string, direction: 'up' | 'down') => {
    const currentIndex = tiers.findIndex((tier) => tier.id === tierId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= tiers.length) return;

    const newTiers = [...tiers];
    [newTiers[currentIndex], newTiers[newIndex]] = [newTiers[newIndex], newTiers[currentIndex]];

    // Update sortOrder
    newTiers.forEach((tier, index) => {
      tier.sortOrder = index;
    });

    onChange(newTiers);
  };

  const handleAddFeature = (tier: PricingTier, featureText: string) => {
    if (!featureText.trim()) return;

    const updatedTiers = tiers.map((t) => {
      if (t.id === tier.id) {
        return {
          ...t,
          features: [...t.features, featureText.trim()],
        };
      }
      return t;
    });

    onChange(updatedTiers);
    setNewFeatureText('');
    setEditingFeatureTierId(null);
  };

  const handleDeleteFeature = (tierId: string, featureIndex: number) => {
    const updatedTiers = tiers.map((tier) => {
      if (tier.id === tierId) {
        return {
          ...tier,
          features: tier.features.filter((_, index) => index !== featureIndex),
        };
      }
      return tier;
    });

    onChange(updatedTiers);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const startEditingTier = (tier: PricingTier) => {
    setEditingTier({ ...tier });
    setEditingTierId(tier.id || null);
  };

  const cancelEditingTier = () => {
    setEditingTier(null);
    setEditingTierId(null);
  };

  if (tiers.length === 0 && !isAddingTier) {
    return (
      <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto">
          <Plus className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-1">No Tiers Defined</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
            Create tiered pricing options like "Basic," "Pro," and "Enterprise" to offer clients
            multiple service levels.
          </p>
          {!readonly && (
            <Button onClick={() => setIsAddingTier(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Tier
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Pricing Tiers</h3>
          <p className="text-sm text-gray-500">
            Define service tiers with different price points and features
          </p>
        </div>
        {!readonly && (
          <Button size="sm" onClick={() => setIsAddingTier(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Tier
          </Button>
        )}
      </div>

      {/* Existing Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiers.map((tier, index) => (
          <Card key={tier.id} className="relative">
            {/* Move buttons */}
            {!readonly && (
              <div className="absolute -top-2 -right-2 flex gap-1 z-10">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-6 w-6 p-0 rounded-full shadow-md"
                  onClick={() => handleMoveTier(tier.id!, 'up')}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-6 w-6 p-0 rounded-full shadow-md"
                  onClick={() => handleMoveTier(tier.id!, 'down')}
                  disabled={index === tiers.length - 1}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
            )}

            <CardHeader className="pb-3">
              {editingTierId === tier.id ? (
                <div className="space-y-2">
                  <Input
                    value={editingTier?.name || ''}
                    onChange={(e) =>
                      setEditingTier(
                        editingTier ? { ...editingTier, name: e.target.value } : null
                      )
                    }
                    placeholder="Tier name (e.g., Data Only)"
                  />
                  <Input
                    type="number"
                    value={editingTier?.amount || 0}
                    onChange={(e) =>
                      setEditingTier(
                        editingTier
                          ? { ...editingTier, amount: parseFloat(e.target.value) || 0 }
                          : null
                      )
                    }
                    placeholder="Price"
                  />
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{tier.name}</CardTitle>
                    {!readonly && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditingTier(tier)}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-purple-600 mt-1">
                    {formatAmount(tier.amount)}
                    <span className="text-sm font-normal text-gray-500">/month</span>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Description */}
              {editingTierId === tier.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editingTier?.description || ''}
                    onChange={(e) =>
                      setEditingTier(
                        editingTier ? { ...editingTier, description: e.target.value } : null
                      )
                    }
                    placeholder="Tier description (min 20 characters)"
                    rows={2}
                    className="resize-none text-sm"
                  />
                  <span
                    className={`text-xs ${(editingTier?.description?.length || 0) < 20 ? 'text-red-500' : 'text-gray-500'}`}
                  >
                    {editingTier?.description?.length || 0}/20 minimum
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-600 leading-relaxed">{tier.description}</p>
              )}

              {/* Features List */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Features</Label>
                <ul className="space-y-1">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2 text-sm group">
                      <span className="text-purple-600 mt-0.5">✓</span>
                      <span className="flex-1 text-gray-700">{feature}</span>
                      {!readonly && editingTierId !== tier.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                          onClick={() => handleDeleteFeature(tier.id!, featureIndex)}
                        >
                          <X className="h-3 w-3 text-red-600" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>

                {/* Add Feature */}
                {!readonly && editingTierId !== tier.id && (
                  <>
                    {editingFeatureTierId === tier.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={newFeatureText}
                          onChange={(e) => setNewFeatureText(e.target.value)}
                          placeholder="Add a feature..."
                          className="text-sm"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddFeature(tier, newFeatureText);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddFeature(tier, newFeatureText)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingFeatureTierId(null);
                            setNewFeatureText('');
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => setEditingFeatureTierId(tier.id!)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add feature
                      </Button>
                    )}
                  </>
                )}
              </div>

              {/* Action Buttons */}
              {editingTierId === tier.id ? (
                <div className="flex gap-2 pt-2 border-t">
                  <Button size="sm" onClick={handleUpdateTier} className="flex-1">
                    <Check className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEditingTier} className="flex-1">
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              ) : (
                !readonly && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteTier(tier.id!)}
                      className="flex-1 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add New Tier Form */}
      {isAddingTier && (
        <Card className="border-2 border-dashed border-purple-300 bg-purple-50/50">
          <CardHeader>
            <CardTitle className="text-base">Add New Tier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tier Name</Label>
                <Input
                  value={newTier.name}
                  onChange={(e) => setNewTier({ ...newTier, name: e.target.value })}
                  placeholder="e.g., Data Only, Pro, Enterprise"
                />
              </div>
              <div>
                <Label className="text-xs">Monthly Price ($)</Label>
                <Input
                  type="number"
                  value={newTier.amount || 0}
                  onChange={(e) =>
                    setNewTier({ ...newTier, amount: parseFloat(e.target.value) || 0 })
                  }
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Description (min 20 characters)</Label>
              <Textarea
                value={newTier.description}
                onChange={(e) => setNewTier({ ...newTier, description: e.target.value })}
                placeholder="Brief description of this tier..."
                rows={2}
                className="resize-none"
              />
              <span
                className={`text-xs ${newTier.description.length < 20 ? 'text-red-500' : 'text-gray-500'}`}
              >
                {newTier.description.length}/20 minimum
              </span>
            </div>

            <div>
              <Label className="text-xs">Features</Label>
              <div className="space-y-2">
                {newTier.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-purple-600">✓</span>
                    <span className="flex-1 text-sm text-gray-700">{feature}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setNewTier({
                          ...newTier,
                          features: newTier.features.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    placeholder="Add a feature..."
                    className="text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newFeatureText.trim()) {
                        setNewTier({
                          ...newTier,
                          features: [...newTier.features, newFeatureText.trim()],
                        });
                        setNewFeatureText('');
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newFeatureText.trim()) {
                        setNewTier({
                          ...newTier,
                          features: [...newTier.features, newFeatureText.trim()],
                        });
                        setNewFeatureText('');
                      }
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleAddTier} className="flex-1">
                <Check className="w-4 h-4 mr-1" />
                Add Tier
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingTier(false);
                  setNewTier({ name: '', description: '', amount: 0, features: [] });
                  setNewFeatureText('');
                }}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Edit2, Trash2, Check, X, Star, Plus, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ProposalPricingOption,
  ProposalPricingLineItem,
  BillingCadence,
  LineItemType,
  UnitType,
} from '@/lib/api/endpoints/proposals';

interface PricingOptionCardProps {
  option: ProposalPricingOption;
  onUpdate: (optionId: string, updates: Partial<ProposalPricingOption>) => void;
  onDelete: (optionId: string) => void;
  onAddLineItem: (optionId: string, lineItem: Partial<ProposalPricingLineItem>) => void;
  onUpdateLineItem: (
    optionId: string,
    lineItemId: string,
    updates: Partial<ProposalPricingLineItem>
  ) => void;
  onDeleteLineItem: (optionId: string, lineItemId: string) => void;
  onToggleRecommended: (optionId: string) => void;
  readonly?: boolean;
}

export function PricingOptionCard({
  option,
  onUpdate,
  onDelete,
  onAddLineItem,
  onUpdateLineItem,
  onDeleteLineItem,
  onToggleRecommended,
  readonly = false,
}: PricingOptionCardProps) {
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [isEditingTerms, setIsEditingTerms] = useState(false);
  const [editingLineItemId, setEditingLineItemId] = useState<string | null>(null);
  const [isAddingLineItem, setIsAddingLineItem] = useState(false);

  // Local state for editing
  const [editLabel, setEditLabel] = useState(option.label);
  const [editSummary, setEditSummary] = useState(option.summary);
  const [editPaymentTerms, setEditPaymentTerms] = useState(option.paymentTerms || '');
  const [editCancellationNotice, setEditCancellationNotice] = useState(
    option.cancellationNotice || ''
  );

  // New line item state
  const [newLineItem, setNewLineItem] = useState<Partial<ProposalPricingLineItem>>({
    lineType: LineItemType.CORE,
    description: '',
    amount: 0,
    unitType: UnitType.FIXED,
    hoursIncluded: undefined,
    notes: '',
  });

  const handleSaveHeader = () => {
    onUpdate(option.id, { label: editLabel });
    setIsEditingHeader(false);
  };

  const handleSaveSummary = () => {
    if (editSummary.length < 50) {
      alert('Summary must be at least 50 characters');
      return;
    }
    onUpdate(option.id, { summary: editSummary });
    setIsEditingSummary(false);
  };

  const handleSaveTerms = () => {
    onUpdate(option.id, {
      paymentTerms: editPaymentTerms,
      cancellationNotice: editCancellationNotice,
    });
    setIsEditingTerms(false);
  };

  const handleAddLineItem = () => {
    if (!newLineItem.description || newLineItem.description.length < 20) {
      alert('Line item description must be at least 20 characters');
      return;
    }
    onAddLineItem(option.id, newLineItem);
    setNewLineItem({
      lineType: LineItemType.CORE,
      description: '',
      amount: 0,
      unitType: UnitType.FIXED,
      hoursIncluded: undefined,
      notes: '',
    });
    setIsAddingLineItem(false);
  };

  const formatAmount = (amount: number, unitType: UnitType) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);

    switch (unitType) {
      case UnitType.HOURLY:
        return `${formatted}/hour`;
      case UnitType.MONTHLY:
        return `${formatted}/month`;
      default:
        return formatted;
    }
  };

  const getBillingCadenceLabel = (cadence: BillingCadence) => {
    switch (cadence) {
      case BillingCadence.FIXED_FEE:
        return 'Fixed Fee';
      case BillingCadence.MONTHLY_RETAINER:
        return 'Monthly Retainer';
      case BillingCadence.HOURLY:
        return 'Hourly';
      default:
        return cadence;
    }
  };

  const getLineTypeColor = (lineType: LineItemType) => {
    switch (lineType) {
      case LineItemType.CORE:
        return 'bg-blue-100 text-blue-800';
      case LineItemType.TIER:
        return 'bg-purple-100 text-purple-800';
      case LineItemType.ADDON:
        return 'bg-green-100 text-green-800';
      case LineItemType.THIRD_PARTY:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="relative">
      {/* Recommended Badge */}
      {option.isRecommended && (
        <div className="absolute -top-3 -right-3 z-10">
          <Badge className="bg-yellow-400 text-yellow-900 px-3 py-1 shadow-md">
            <Star className="w-3 h-3 mr-1 inline" />
            Recommended
          </Badge>
        </div>
      )}

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Option Label */}
            {isEditingHeader ? (
              <div className="space-y-2">
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="Option A: Diagnostic Sprint"
                  className="text-lg font-semibold"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveHeader}>
                    <Check className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditLabel(option.label);
                      setIsEditingHeader(false);
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">{option.label}</CardTitle>
                {!readonly && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingHeader(true)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Billing Cadence Badge */}
            <Badge variant="outline" className="mt-2">
              {getBillingCadenceLabel(option.billingCadence)}
            </Badge>
          </div>

          {/* Action Buttons */}
          {!readonly && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onToggleRecommended(option.id)}
                title="Mark as recommended"
              >
                <Star
                  className={`w-4 h-4 ${option.isRecommended ? 'fill-yellow-400 text-yellow-400' : ''}`}
                />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDelete(option.id)}
                title="Delete option"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Section */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Summary
          </Label>
          {isEditingSummary ? (
            <div className="space-y-2">
              <Textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                placeholder="Describe this pricing option (min 50 characters)"
                rows={4}
                className="resize-none"
              />
              <div className="flex justify-between items-center">
                <span
                  className={`text-xs ${editSummary.length < 50 ? 'text-red-500' : 'text-gray-500'}`}
                >
                  {editSummary.length}/50 minimum characters
                </span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveSummary}>
                    <Check className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditSummary(option.summary);
                      setIsEditingSummary(false);
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="group relative">
              <p className="text-sm text-gray-600 leading-relaxed">{option.summary}</p>
              {!readonly && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setIsEditingSummary(true)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Line Items Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium text-gray-700">
              Pricing Details
            </Label>
            {!readonly && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddingLineItem(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Line Item
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {option.lineItems.map((lineItem) => (
              <div
                key={lineItem.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                {!readonly && (
                  <GripVertical className="w-4 h-4 text-gray-400 mt-1 cursor-move" />
                )}

                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getLineTypeColor(lineItem.lineType)}>
                          {lineItem.lineType}
                        </Badge>
                        <span className="text-sm font-semibold">
                          {formatAmount(lineItem.amount, lineItem.unitType)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {lineItem.description}
                      </p>
                      {lineItem.hoursIncluded && (
                        <p className="text-xs text-gray-500 mt-1">
                          Includes {lineItem.hoursIncluded} hours
                        </p>
                      )}
                      {lineItem.notes && (
                        <p className="text-xs text-gray-500 italic mt-1">
                          Note: {lineItem.notes}
                        </p>
                      )}
                      {lineItem.requiresApproval && (
                        <Badge variant="outline" className="mt-1">
                          Requires Approval
                        </Badge>
                      )}
                    </div>

                    {!readonly && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingLineItemId(lineItem.id)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteLineItem(option.id, lineItem.id)}
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Line Item Form */}
            {isAddingLineItem && (
              <div className="p-4 border-2 border-dashed rounded-lg space-y-3 bg-gray-50">
                <h4 className="font-medium text-sm">Add New Line Item</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={newLineItem.lineType}
                      onValueChange={(value) =>
                        setNewLineItem({ ...newLineItem, lineType: value as LineItemType })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={LineItemType.CORE}>Core Service</SelectItem>
                        <SelectItem value={LineItemType.TIER}>Tier</SelectItem>
                        <SelectItem value={LineItemType.ADDON}>Add-on</SelectItem>
                        <SelectItem value={LineItemType.THIRD_PARTY}>Third Party</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Unit Type</Label>
                    <Select
                      value={newLineItem.unitType}
                      onValueChange={(value) =>
                        setNewLineItem({ ...newLineItem, unitType: value as UnitType })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UnitType.FIXED}>Fixed</SelectItem>
                        <SelectItem value={UnitType.HOURLY}>Hourly</SelectItem>
                        <SelectItem value={UnitType.MONTHLY}>Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Amount ($)</Label>
                  <Input
                    type="number"
                    value={newLineItem.amount || 0}
                    onChange={(e) =>
                      setNewLineItem({ ...newLineItem, amount: parseFloat(e.target.value) || 0 })
                    }
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <Label className="text-xs">
                    Description (min 20 characters)
                  </Label>
                  <Textarea
                    value={newLineItem.description || ''}
                    onChange={(e) =>
                      setNewLineItem({ ...newLineItem, description: e.target.value })
                    }
                    placeholder="Twenty Hour Diagnostic Sprint • Fixed fee for one month..."
                    rows={3}
                    className="resize-none"
                  />
                  <span
                    className={`text-xs ${(newLineItem.description?.length || 0) < 20 ? 'text-red-500' : 'text-gray-500'}`}
                  >
                    {newLineItem.description?.length || 0}/20 minimum characters
                  </span>
                </div>

                {newLineItem.lineType === LineItemType.CORE && (
                  <div>
                    <Label className="text-xs">Hours Included (optional)</Label>
                    <Input
                      type="number"
                      value={newLineItem.hoursIncluded || ''}
                      onChange={(e) =>
                        setNewLineItem({
                          ...newLineItem,
                          hoursIncluded: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      min="0"
                      placeholder="e.g., 20"
                    />
                  </div>
                )}

                <div>
                  <Label className="text-xs">Notes (optional)</Label>
                  <Input
                    value={newLineItem.notes || ''}
                    onChange={(e) =>
                      setNewLineItem({ ...newLineItem, notes: e.target.value })
                    }
                    placeholder="e.g., Unused hours do not roll over"
                  />
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddLineItem}>
                    <Check className="w-4 h-4 mr-1" />
                    Add Line Item
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsAddingLineItem(false);
                      setNewLineItem({
                        lineType: LineItemType.CORE,
                        description: '',
                        amount: 0,
                        unitType: UnitType.FIXED,
                        hoursIncluded: undefined,
                        notes: '',
                      });
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Terms & Cancellation Section */}
        <div className="border-t pt-4">
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Terms & Conditions
          </Label>
          {isEditingTerms ? (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Payment Terms</Label>
                <Textarea
                  value={editPaymentTerms}
                  onChange={(e) => setEditPaymentTerms(e.target.value)}
                  placeholder="Net 30, payment due upon project completion..."
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div>
                <Label className="text-xs">Cancellation Notice</Label>
                <Textarea
                  value={editCancellationNotice}
                  onChange={(e) => setEditCancellationNotice(e.target.value)}
                  placeholder="30-day written notice required..."
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveTerms}>
                  <Check className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditPaymentTerms(option.paymentTerms || '');
                    setEditCancellationNotice(option.cancellationNotice || '');
                    setIsEditingTerms(false);
                  }}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 group relative">
              {option.paymentTerms && (
                <div>
                  <span className="text-xs font-medium text-gray-600">Payment Terms: </span>
                  <span className="text-xs text-gray-700">{option.paymentTerms}</span>
                </div>
              )}
              {option.cancellationNotice && (
                <div>
                  <span className="text-xs font-medium text-gray-600">Cancellation: </span>
                  <span className="text-xs text-gray-700">{option.cancellationNotice}</span>
                </div>
              )}
              {!readonly && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setIsEditingTerms(true)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

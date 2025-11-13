'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import type { ProposedProjectPhase } from '@/types/proposal';
import { validatePhase } from '@/utils/proposal-normalizers';

interface TimelineBuilderProps {
  value: ProposedProjectPhase[];
  onChange: (phases: ProposedProjectPhase[]) => void;
}

export function TimelineBuilder({ value, onChange }: TimelineBuilderProps) {
  const [phases, setPhases] = useState<ProposedProjectPhase[]>(value || []);

  // Sync state when value prop changes (e.g., from AI regeneration)
  useEffect(() => {
    setPhases(value || []);
  }, [value]);

  const update = (next: ProposedProjectPhase[]) => {
    setPhases(next);
    onChange(next);
  };

  const addPhase = () => {
    update([
      ...phases,
      {
        phase: '',
        commitment: '',
        window: '',
        focus: '',
        bullets: [],
        estimatedHours: { perMonth: 0, perWeek: 0 },
      },
    ]);
  };

  const removePhase = (index: number) => {
    const next = [...phases];
    next.splice(index, 1);
    update(next);
  };

  const setField = (index: number, field: keyof ProposedProjectPhase, val: any) => {
    const next = [...phases];
    (next[index] as any)[field] = val;
    update(next);
  };

  const addBullet = (phaseIndex: number) => {
    const next = [...phases];
    next[phaseIndex] = {
      ...next[phaseIndex],
      bullets: [...next[phaseIndex].bullets, ''],
    };
    update(next);
  };

  const removeBullet = (phaseIndex: number, bulletIndex: number) => {
    const next = [...phases];
    next[phaseIndex] = {
      ...next[phaseIndex],
      bullets: next[phaseIndex].bullets.filter((_, i) => i !== bulletIndex),
    };
    update(next);
  };

  const updateBullet = (phaseIndex: number, bulletIndex: number, value: string) => {
    const next = [...phases];
    const bullets = [...next[phaseIndex].bullets];
    bullets[bulletIndex] = value;
    next[phaseIndex] = {
      ...next[phaseIndex],
      bullets,
    };
    update(next);
  };

  if (phases.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">
            No project phases defined yet
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Add phases to create a structured timeline with estimated hours
          </p>
          <Button onClick={addPhase} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add First Phase
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Define project phases with commitment timelines and estimated hours
        </p>
        <Button type="button" size="sm" onClick={addPhase} className="gap-1">
          <Plus className="h-4 w-4" /> Add Phase
        </Button>
      </div>

      <div className="space-y-4">
        {phases.map((phase, idx) => {
          const error = validatePhase(phase);

          return (
            <div
              key={idx}
              className="rounded-lg border border-gray-200 p-4 space-y-4 border-l-4 border-l-blue-500"
            >
              {/* Header: Phase Name + Delete */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <Label htmlFor={`phase-${idx}-name`} className="text-sm font-medium">
                    Phase Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`phase-${idx}-name`}
                    placeholder="e.g., Discovery and Planning"
                    value={phase.phase}
                    onChange={(e) => setField(idx, 'phase', e.target.value)}
                    className={`font-medium ${error ? 'border-red-300' : ''}`}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removePhase(idx)}
                  className="mt-6"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>

              {error && (
                <p className="text-xs text-red-600">{error}</p>
              )}

              {/* Timeline Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`phase-${idx}-commitment`} className="text-xs font-medium">
                    Commitment / Timing <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`phase-${idx}-commitment`}
                    placeholder="e.g., Weeks 1-2"
                    value={phase.commitment}
                    onChange={(e) => setField(idx, 'commitment', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`phase-${idx}-window`} className="text-xs font-medium">
                    Duration / Window
                  </Label>
                  <Input
                    id={`phase-${idx}-window`}
                    placeholder="e.g., 2 weeks"
                    value={phase.window}
                    onChange={(e) => setField(idx, 'window', e.target.value)}
                  />
                </div>
              </div>

              {/* Focus / Objective */}
              <div className="space-y-1">
                <Label htmlFor={`phase-${idx}-focus`} className="text-sm font-medium">
                  Focus / Main Objective <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id={`phase-${idx}-focus`}
                  placeholder="Primary goal of this phase..."
                  value={phase.focus}
                  onChange={(e) => setField(idx, 'focus', e.target.value)}
                  rows={2}
                />
              </div>

              {/* Bullets / Tasks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Key Tasks / Activities</Label>
                  <Button
                    type="button"
                    onClick={() => addBullet(idx)}
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Task
                  </Button>
                </div>

                {(!phase.bullets || phase.bullets.length === 0) && (
                  <p className="text-xs text-gray-500 italic">No tasks added yet</p>
                )}

                <div className="space-y-2">
                  {(phase.bullets || []).map((bullet, bulletIdx) => (
                    <div key={bulletIdx} className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm shrink-0">•</span>
                      <Input
                        value={bullet}
                        onChange={(e) => updateBullet(idx, bulletIdx, e.target.value)}
                        placeholder="e.g., Conduct kickoff meeting"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={() => removeBullet(idx, bulletIdx)}
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

              {/* Estimated Hours */}
              <div className="border-t pt-4">
                <Label className="text-sm font-medium mb-2 block">Estimated Hours</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor={`phase-${idx}-hours-week`} className="text-xs font-medium text-gray-600">
                      Per Week
                    </Label>
                    <Input
                      id={`phase-${idx}-hours-week`}
                      type="number"
                      min="0"
                      step="0.5"
                      value={phase.estimatedHours.perWeek}
                      onChange={(e) =>
                        setField(idx, 'estimatedHours', {
                          ...phase.estimatedHours,
                          perWeek: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`phase-${idx}-hours-month`} className="text-xs font-medium text-gray-600">
                      Per Month
                    </Label>
                    <Input
                      id={`phase-${idx}-hours-month`}
                      type="number"
                      min="0"
                      step="1"
                      value={phase.estimatedHours.perMonth}
                      onChange={(e) =>
                        setField(idx, 'estimatedHours', {
                          ...phase.estimatedHours,
                          perMonth: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="text-xs text-gray-500 text-center pt-2">
        {phases.length} phase{phases.length === 1 ? '' : 's'} defined
        {phases.some((p) => validatePhase(p)) && (
          <span className="text-red-600 ml-2">• Some phases need attention</span>
        )}
      </div>
    </div>
  );
}

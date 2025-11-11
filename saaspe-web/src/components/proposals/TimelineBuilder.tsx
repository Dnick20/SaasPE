'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, CheckCircle2, Clock, Plus, Trash2 } from 'lucide-react';

export type TimelinePhaseStatus = 'planned' | 'in_progress' | 'complete';

export interface TimelinePhase {
  title: string;
  start?: string;
  end?: string;
  status?: TimelinePhaseStatus;
  notes?: string;
}

interface TimelineBuilderProps {
  value: TimelinePhase[];
  onChange: (phases: TimelinePhase[]) => void;
}

export function TimelineBuilder({ value, onChange }: TimelineBuilderProps) {
  const [phases, setPhases] = useState<TimelinePhase[]>(value || []);

  // Sync state when value prop changes (e.g., from AI regeneration)
  useEffect(() => {
    setPhases(value || []);
  }, [value]);

  const update = (next: TimelinePhase[]) => {
    setPhases(next);
    onChange(next);
  };

  const addPhase = () => {
    update([
      ...phases,
      { title: '', status: 'planned' },
    ]);
  };

  const removePhase = (index: number) => {
    const next = [...phases];
    next.splice(index, 1);
    update(next);
  };

  const setField = (index: number, field: keyof TimelinePhase, val: string) => {
    const next = [...phases];
    (next[index] as any)[field] = val;
    update(next);
  };

  const StatusIcon = ({ status }: { status?: TimelinePhaseStatus }) => {
    if (status === 'complete') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (status === 'in_progress') return <Clock className="h-4 w-4 text-blue-600" />;
    return <Calendar className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Define clear phases with dates and statuses</p>
        <Button type="button" size="sm" onClick={addPhase} className="gap-1">
          <Plus className="h-4 w-4" /> Add Phase
        </Button>
      </div>

      {phases.length === 0 && (
        <p className="text-sm text-gray-500">No phases yet. Click "Add Phase" to get started.</p>
      )}

      <div className="space-y-4">
        {phases.map((phase, idx) => (
          <div key={idx} className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <StatusIcon status={phase.status} />
                <Input
                  placeholder="Phase title (e.g., Discovery, Implementation)"
                  value={phase.title}
                  onChange={(e) => setField(idx, 'title', e.target.value)}
                  className="font-medium"
                />
              </div>
              <Button type="button" variant="outline" size="icon" onClick={() => removePhase(idx)}>
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-gray-500">Start Date</Label>
                <Input
                  type="date"
                  value={phase.start || ''}
                  onChange={(e) => setField(idx, 'start', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">End Date</Label>
                <Input
                  type="date"
                  value={phase.end || ''}
                  onChange={(e) => setField(idx, 'end', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Status</Label>
                <select
                  className="w-full border border-gray-300 rounded-md h-10 px-3 text-sm"
                  value={phase.status || 'planned'}
                  onChange={(e) => setField(idx, 'status', e.target.value)}
                >
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="complete">Complete</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <Label className="text-xs text-gray-500">Notes</Label>
              <Textarea
                placeholder="Details or acceptance criteria for this phase"
                value={phase.notes || ''}
                onChange={(e) => setField(idx, 'notes', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}




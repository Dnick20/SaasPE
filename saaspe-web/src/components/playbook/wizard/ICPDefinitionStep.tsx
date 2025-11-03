'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';

interface ICPDefinitionStepProps {
  data: {
    industry?: string;
    companySize?: string;
    roles: string[];
    painPoints: string[];
  };
  onChange: (data: any) => void;
}

export function ICPDefinitionStep({ data, onChange }: ICPDefinitionStepProps) {
  const [newRole, setNewRole] = useState('');
  const [newPainPoint, setNewPainPoint] = useState('');

  const addRole = () => {
    if (newRole.trim()) {
      onChange({
        ...data,
        roles: [...data.roles, newRole.trim()],
      });
      setNewRole('');
    }
  };

  const removeRole = (index: number) => {
    onChange({
      ...data,
      roles: data.roles.filter((_, i) => i !== index),
    });
  };

  const addPainPoint = () => {
    if (newPainPoint.trim()) {
      onChange({
        ...data,
        painPoints: [...data.painPoints, newPainPoint.trim()],
      });
      setNewPainPoint('');
    }
  };

  const removePainPoint = (index: number) => {
    onChange({
      ...data,
      painPoints: data.painPoints.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Define Your Ideal Customer Profile</h2>
        <p className="text-gray-500 mt-1">
          Help us understand who you're targeting so we can create personalized scripts
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label htmlFor="industry">Target Industry</Label>
            <Input
              id="industry"
              value={data.industry || ''}
              onChange={(e) => onChange({ ...data, industry: e.target.value })}
              placeholder="e.g., Technology, Healthcare, Finance"
            />
          </div>

          <div>
            <Label htmlFor="companySize">Company Size</Label>
            <Input
              id="companySize"
              value={data.companySize || ''}
              onChange={(e) => onChange({ ...data, companySize: e.target.value })}
              placeholder="e.g., 50-200 employees, Enterprise (1000+)"
            />
          </div>

          <div>
            <Label>Target Roles / Job Titles</Label>
            <div className="space-y-2">
              {data.roles.map((role, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-gray-100 rounded-md flex items-center justify-between">
                    <span>{role}</span>
                    <button
                      type="button"
                      onClick={() => removeRole(index)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g., CTO, VP Engineering"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRole())}
                />
                <Button type="button" onClick={addRole} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label>Pain Points / Challenges</Label>
            <p className="text-sm text-gray-500 mb-2">
              What problems does your solution solve for them?
            </p>
            <div className="space-y-2">
              {data.painPoints.map((painPoint, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-gray-100 rounded-md flex items-center justify-between">
                    <span>{painPoint}</span>
                    <button
                      type="button"
                      onClick={() => removePainPoint(index)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newPainPoint}
                  onChange={(e) => setNewPainPoint(e.target.value)}
                  placeholder="e.g., Scaling issues, Legacy systems"
                  onKeyPress={(e) =>
                    e.key === 'Enter' && (e.preventDefault(), addPainPoint())
                  }
                />
                <Button type="button" onClick={addPainPoint} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

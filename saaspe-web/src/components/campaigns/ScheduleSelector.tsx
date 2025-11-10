'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

const SUGGESTED_SCHEDULE = {
  sendDays: [1, 2, 3, 4, 5], // Mon-Fri
  sendTimeStart: '09:00',
  sendTimeEnd: '17:00',
  timezone: 'America/New_York',
  dailyLimit: 50,
};

interface ScheduleValue {
  sendDays: number[];
  sendTimeStart: string;
  sendTimeEnd: string;
  timezone: string;
}

interface ScheduleSelectorProps {
  value: ScheduleValue;
  onChange: (value: ScheduleValue) => void;
}

export function ScheduleSelector({ value, onChange }: ScheduleSelectorProps) {
  const [mode, setMode] = useState<'suggested' | 'custom'>('suggested');

  const handleModeChange = (newMode: 'suggested' | 'custom') => {
    setMode(newMode);
    if (newMode === 'suggested') {
      onChange(SUGGESTED_SCHEDULE);
    }
  };

  const toggleDay = (day: number) => {
    const current = value.sendDays || [];
    if (current.includes(day)) {
      onChange({ ...value, sendDays: current.filter((d) => d !== day) });
    } else {
      onChange({ ...value, sendDays: [...current, day] });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sending Schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === 'suggested' ? 'default' : 'outline'}
            onClick={() => handleModeChange('suggested')}
            className="flex-1"
          >
            Suggested Schedule
          </Button>
          <Button
            type="button"
            variant={mode === 'custom' ? 'default' : 'outline'}
            onClick={() => handleModeChange('custom')}
            className="flex-1"
          >
            Custom Schedule
          </Button>
        </div>

        {mode === 'suggested' ? (
          <div className="p-4 bg-blue-50 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm text-blue-900">Recommended Settings:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✅ Monday - Friday</li>
              <li>✅ 9:00 AM - 5:00 PM (Recipient's timezone)</li>
              <li>✅ 50-100 emails per day</li>
            </ul>
            <p className="text-xs text-blue-700 pt-2">
              This schedule maximizes deliverability and response rates based on industry best practices.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Day Selection */}
            <div>
              <Label className="mb-2 block">Send Days *</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                      value.sendDays?.includes(day.value)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sendTimeStart">Start Time *</Label>
                <Input
                  type="time"
                  id="sendTimeStart"
                  value={value.sendTimeStart}
                  onChange={(e) => onChange({ ...value, sendTimeStart: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="sendTimeEnd">End Time *</Label>
                <Input
                  type="time"
                  id="sendTimeEnd"
                  value={value.sendTimeEnd}
                  onChange={(e) => onChange({ ...value, sendTimeEnd: e.target.value })}
                />
              </div>
            </div>

            {/* Timezone */}
            <div>
              <Label htmlFor="timezone">Timezone *</Label>
              <select
                id="timezone"
                value={value.timezone}
                onChange={(e) => onChange({ ...value, timezone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="America/Phoenix">Arizona Time (MST)</option>
                <option value="America/Anchorage">Alaska Time (AKT)</option>
                <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
              </select>
            </div>

            <p className="text-sm text-gray-500">
              Emails will only be sent during the specified time window on selected days.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

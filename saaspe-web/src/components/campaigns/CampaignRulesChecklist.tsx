'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface CampaignRulesChecklistProps {
  onAcknowledge: () => void;
  disabled?: boolean;
}

export function CampaignRulesChecklist({ onAcknowledge, disabled }: CampaignRulesChecklistProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Final Campaign Rules & Guidelines
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Copywriting Best Practices
            </h4>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-6">
              <li>Subject lines: 5-7 words, curiosity-driven</li>
              <li>Body content: Under 500 characters</li>
              <li>Conversational, personal tone (like emailing a colleague)</li>
              <li>Lead with value, not a pitch</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Critical Deliverability Rules
            </h4>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-6">
              <li>NO attachments in first email</li>
              <li>NO tracking links or pixels initially</li>
              <li>Warm mailboxes before high-volume sending</li>
              <li>Use personalization ({"{{name}}"}, {"{{company}}"})</li>
              <li>Rotate senders when possible</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Follow-Up Strategy</h4>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-6">
              <li>2-3 follow-ups, spaced 2-3 days apart</li>
              <li>Each adds new value (case study, insight, resource)</li>
              <li>Light CTAs - no hard sells</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Signature Format</h4>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-6">
              <li>Simple, human signature</li>
              <li>No logos or heavy formatting</li>
              <li>Format: "Name" or "Name | Company"</li>
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
              disabled={disabled}
            />
            <div className="flex-1">
              <p className="text-sm font-medium">
                I understand and agree to follow all email best practices and deliverability rules
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Violating these rules may result in poor deliverability, spam complaints, or account restrictions
              </p>
            </div>
          </label>

          <Button
            onClick={onAcknowledge}
            disabled={!acknowledged || disabled}
            className="w-full"
            size="lg"
          >
            {acknowledged
              ? 'Acknowledge & Activate Campaign'
              : 'Please acknowledge the rules above to continue'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

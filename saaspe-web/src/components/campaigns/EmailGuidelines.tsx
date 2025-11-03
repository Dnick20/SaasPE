'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { EMAIL_GUIDELINES } from '@/lib/constants/emailGuidelines';

interface EmailGuidelinesProps {
  onAcknowledgmentChange?: (allAcknowledged: boolean) => void;
}

export function EmailGuidelines({ onAcknowledgmentChange }: EmailGuidelinesProps) {
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  const allRequiredAcknowledged = EMAIL_GUIDELINES.sections
    .filter((s) => s.acknowledgmentRequired)
    .every((s) => acknowledged.has(s.id));

  useEffect(() => {
    onAcknowledgmentChange?.(allRequiredAcknowledged);
  }, [allRequiredAcknowledged, onAcknowledgmentChange]);

  const handleToggleAcknowledgment = (sectionId: string, checked: boolean) => {
    const newAck = new Set(acknowledged);
    if (checked) {
      newAck.add(sectionId);
    } else {
      newAck.delete(sectionId);
    }
    setAcknowledged(newAck);
  };

  return (
    <Card className="sticky top-4 h-fit">
      <CardHeader>
        <CardTitle className="text-lg">Email Best Practices</CardTitle>
        <p className="text-sm text-gray-500">
          Follow these guidelines for maximum deliverability and engagement
        </p>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {EMAIL_GUIDELINES.sections.map((section) => (
            <AccordionItem key={section.id} value={section.id}>
              <AccordionTrigger className="text-left">
                <span className="flex items-center gap-2">
                  <span>{section.icon}</span>
                  <span className="text-sm font-medium">{section.title}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 mb-4">
                  {section.rules.map((rule, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      {rule.required && <span className="text-red-500 font-bold">*</span>}
                      <span>{rule.text}</span>
                    </li>
                  ))}
                </ul>

                {section.acknowledgmentRequired && (
                  <div className="pt-3 border-t">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={acknowledged.has(section.id)}
                        onCheckedChange={(checked) =>
                          handleToggleAcknowledgment(section.id, checked as boolean)
                        }
                      />
                      <span className="text-sm">I understand these guidelines</span>
                    </label>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div
          className={`mt-4 p-3 rounded-md transition-colors ${
            allRequiredAcknowledged
              ? 'bg-green-50 text-green-900'
              : 'bg-amber-50 text-amber-900'
          }`}
        >
          <p className="text-sm font-medium">
            {allRequiredAcknowledged
              ? '✅ All required guidelines acknowledged'
              : '⚠️ Please acknowledge all required guidelines above'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Linkedin, Phone } from 'lucide-react';
import { EmailScript, LinkedInScript, ColdCallScript } from '@/lib/api/endpoints/playbooks';

interface ReviewScriptsStepProps {
  data: {
    emailScript: EmailScript;
    linkedInScript: LinkedInScript;
    coldCallScript: ColdCallScript;
  };
  onChange: (data: {
    emailScript: EmailScript;
    linkedInScript: LinkedInScript;
    coldCallScript: ColdCallScript;
  }) => void;
}

export function ReviewScriptsStep({ data, onChange }: ReviewScriptsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Review & Edit Scripts</h2>
        <p className="text-gray-500 mt-1">
          Review the AI-generated scripts and make any adjustments
        </p>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="linkedin" className="flex items-center gap-2">
            <Linkedin className="h-4 w-4" />
            LinkedIn
          </TabsTrigger>
          <TabsTrigger value="coldcall" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Cold Call
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Script</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email-subject">Subject Line</Label>
                <Textarea
                  id="email-subject"
                  value={data.emailScript?.subject || ''}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      emailScript: {
                        ...data.emailScript,
                        subject: e.target.value,
                      },
                    })
                  }
                  rows={2}
                  placeholder="Email subject line"
                />
              </div>

              <div>
                <Label htmlFor="email-body">Email Body</Label>
                <Textarea
                  id="email-body"
                  value={data.emailScript?.body || ''}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      emailScript: {
                        ...data.emailScript,
                        body: e.target.value,
                      },
                    })
                  }
                  rows={12}
                  placeholder="Email body content"
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="email-cta-text">Call-to-Action Text</Label>
                <Textarea
                  id="email-cta-text"
                  value={data.emailScript?.ctaText || ''}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      emailScript: {
                        ...data.emailScript,
                        ctaText: e.target.value,
                      },
                    })
                  }
                  rows={2}
                  placeholder="e.g., Schedule a call"
                />
              </div>

              <div>
                <Label htmlFor="email-cta-url">Call-to-Action URL (Optional)</Label>
                <Textarea
                  id="email-cta-url"
                  value={data.emailScript?.ctaUrl || ''}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      emailScript: {
                        ...data.emailScript,
                        ctaUrl: e.target.value,
                      },
                    })
                  }
                  rows={1}
                  placeholder="https://calendly.com/..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="linkedin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>LinkedIn Script</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="linkedin-connection">Connection Request</Label>
                <Textarea
                  id="linkedin-connection"
                  value={data.linkedInScript?.connectionRequest || ''}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      linkedInScript: {
                        ...data.linkedInScript,
                        connectionRequest: e.target.value,
                      },
                    })
                  }
                  rows={4}
                  placeholder="LinkedIn connection request message"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max 300 characters for connection requests
                </p>
              </div>

              <div>
                <Label htmlFor="linkedin-first-message">First Message</Label>
                <Textarea
                  id="linkedin-first-message"
                  value={data.linkedInScript?.firstMessage || ''}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      linkedInScript: {
                        ...data.linkedInScript,
                        firstMessage: e.target.value,
                      },
                    })
                  }
                  rows={8}
                  placeholder="First message after connection accepted"
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="linkedin-followup-message">Follow-up Message</Label>
                <Textarea
                  id="linkedin-followup-message"
                  value={data.linkedInScript?.followUpMessage || ''}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      linkedInScript: {
                        ...data.linkedInScript,
                        followUpMessage: e.target.value,
                      },
                    })
                  }
                  rows={8}
                  placeholder="Follow-up message if no response"
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coldcall" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cold Call Script</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="coldcall-opener">Opener</Label>
                <Textarea
                  id="coldcall-opener"
                  value={data.coldCallScript?.opener || ''}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      coldCallScript: {
                        ...data.coldCallScript,
                        opener: e.target.value,
                      },
                    })
                  }
                  rows={3}
                  placeholder="Opening statement for cold calls"
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="coldcall-discovery">Discovery Questions</Label>
                <Textarea
                  id="coldcall-discovery"
                  value={
                    Array.isArray(data.coldCallScript?.discovery)
                      ? data.coldCallScript.discovery.join('\n')
                      : data.coldCallScript?.discovery || ''
                  }
                  onChange={(e) =>
                    onChange({
                      ...data,
                      coldCallScript: {
                        ...data.coldCallScript,
                        discovery: e.target.value.split('\n'),
                      },
                    })
                  }
                  rows={6}
                  placeholder="One question per line"
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="coldcall-close">Close</Label>
                <Textarea
                  id="coldcall-close"
                  value={data.coldCallScript?.close || ''}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      coldCallScript: {
                        ...data.coldCallScript,
                        close: e.target.value,
                      },
                    })
                  }
                  rows={3}
                  placeholder="Closing statement"
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

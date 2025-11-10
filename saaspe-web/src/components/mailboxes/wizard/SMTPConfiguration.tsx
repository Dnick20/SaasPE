'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { CreateMailboxDto } from '@/lib/api/mailboxes';
import { toast } from 'sonner';
import { Shield, Info } from 'lucide-react';
import { trackSMTPConfigured } from '@/lib/analytics/email-accounts';

/**
 * SMTP Configuration Step
 *
 * Collect SMTP credentials for custom email providers
 */

interface SMTPConfigurationProps {
  onComplete: (data: Partial<CreateMailboxDto>) => void;
  onBack: () => void;
}

export function SMTPConfiguration({
  onComplete,
  onBack,
}: SMTPConfigurationProps) {
  const [formData, setFormData] = useState({
    email: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    smtpUseSsl: true,
  });

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleContinue = () => {
    // Validate required fields
    if (!formData.email || !formData.smtpHost || !formData.smtpUsername || !formData.smtpPassword) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Track SMTP configuration
    trackSMTPConfigured(formData.smtpHost, formData.smtpPort, formData.smtpUseSsl);

    onComplete({
      email: formData.email,
      smtpHost: formData.smtpHost,
      smtpPort: formData.smtpPort,
      smtpUsername: formData.smtpUsername,
      smtpPassword: formData.smtpPassword,
      smtpUseSsl: formData.smtpUseSsl,
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">
          SMTP Configuration
        </h3>
        <p className="text-sm text-muted-foreground">
          Enter your SMTP server details
        </p>
      </div>

      {/* Email Address */}
      <div className="space-y-2">
        <Label htmlFor="email">
          Email Address <span className="text-red-500">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="your-email@domain.com"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
        />
      </div>

      {/* SMTP Host */}
      <div className="space-y-2">
        <Label htmlFor="smtpHost">
          SMTP Host <span className="text-red-500">*</span>
        </Label>
        <Input
          id="smtpHost"
          type="text"
          placeholder="smtp.gmail.com"
          value={formData.smtpHost}
          onChange={(e) => handleChange('smtpHost', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Your SMTP server address (e.g., smtp.gmail.com, smtp.office365.com)
        </p>
      </div>

      {/* SMTP Port & SSL */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="smtpPort">
            SMTP Port <span className="text-red-500">*</span>
          </Label>
          <Input
            id="smtpPort"
            type="number"
            placeholder="587"
            value={formData.smtpPort}
            onChange={(e) => handleChange('smtpPort', parseInt(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Usually 587 (TLS) or 465 (SSL)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtpUseSsl" className="flex items-center gap-2">
            Use SSL/TLS
            <Shield className="w-4 h-4 text-green-600" />
          </Label>
          <div className="flex items-center h-10">
            <Switch
              id="smtpUseSsl"
              checked={formData.smtpUseSsl}
              onCheckedChange={(checked) => handleChange('smtpUseSsl', checked)}
            />
            <span className="ml-3 text-sm text-muted-foreground">
              {formData.smtpUseSsl ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* SMTP Username */}
      <div className="space-y-2">
        <Label htmlFor="smtpUsername">
          SMTP Username <span className="text-red-500">*</span>
        </Label>
        <Input
          id="smtpUsername"
          type="text"
          placeholder="Usually your email address"
          value={formData.smtpUsername}
          onChange={(e) => handleChange('smtpUsername', e.target.value)}
        />
      </div>

      {/* SMTP Password */}
      <div className="space-y-2">
        <Label htmlFor="smtpPassword">
          SMTP Password <span className="text-red-500">*</span>
        </Label>
        <Input
          id="smtpPassword"
          type="password"
          placeholder="Your SMTP password or app password"
          value={formData.smtpPassword}
          onChange={(e) => handleChange('smtpPassword', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          For Gmail, use an{' '}
          <a
            href="https://support.google.com/accounts/answer/185833"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            App Password
          </a>
          , not your regular password
        </p>
      </div>

      {/* Security Notice */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-sm mb-1">Security Notice</h4>
            <p className="text-sm text-muted-foreground">
              Your password will be encrypted before storage. We recommend using OAuth
              connections (Google/Microsoft) for better security.
            </p>
          </div>
        </div>
      </Card>

      {/* Common SMTP Settings Helper */}
      <Card className="p-4 bg-gray-50 border-gray-200">
        <h4 className="font-medium text-sm mb-3">Common SMTP Settings</h4>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="font-medium mb-1">Gmail</p>
            <p className="text-muted-foreground">smtp.gmail.com:587</p>
          </div>
          <div>
            <p className="font-medium mb-1">Outlook/Office 365</p>
            <p className="text-muted-foreground">smtp.office365.com:587</p>
          </div>
          <div>
            <p className="font-medium mb-1">Yahoo</p>
            <p className="text-muted-foreground">smtp.mail.yahoo.com:587</p>
          </div>
          <div>
            <p className="font-medium mb-1">Custom</p>
            <p className="text-muted-foreground">Check your provider</p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}

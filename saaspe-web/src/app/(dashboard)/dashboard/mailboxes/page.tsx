'use client';


export const dynamic = 'force-dynamic';
import React, { useState } from 'react';
import { EmailWizard } from '@/components/mailboxes/EmailWizard';
import { MailboxList } from '@/components/mailboxes/MailboxList';
import { BuyMailboxDialog } from '@/components/mailboxes/BuyMailboxDialog';
import { Button } from '@/components/ui/button';

/**
 * Mailboxes Page
 *
 * Manage email accounts for campaigns
 *
 * Route: /dashboard/mailboxes
 */
export default function MailboxesPage() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isBuyOpen, setIsBuyOpen] = useState(false);

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Email Accounts</h1>
        <p className="text-muted-foreground">
          Connect and manage your email accounts for sending campaigns
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mb-4">
        <Button onClick={() => setIsWizardOpen(true)}>Connect Existing Mailbox</Button>
        <Button variant="outline" onClick={() => setIsBuyOpen(true)}>Buy Managed Mailbox</Button>
      </div>

      {/* Mailbox List */}
      <MailboxList onAddMailbox={() => setIsWizardOpen(true)} />

      {/* Email Wizard Dialog */}
      <EmailWizard
        open={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => {
          setIsWizardOpen(false);
        }}
      />

      {/* Buy Mailbox Dialog */}
      <BuyMailboxDialog
        open={isBuyOpen}
        onClose={() => setIsBuyOpen(false)}
        onPurchased={() => setIsBuyOpen(false)}
      />
    </div>
  );
}

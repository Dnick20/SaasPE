'use client';

import React, { useState } from 'react';
import { useMailboxes, useDeleteMailbox } from '@/lib/hooks/useMailboxes';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Mail,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  MoreVertical,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Mailbox } from '@/lib/api/mailboxes';

/**
 * Mailbox List Component
 *
 * Displays all email accounts with status, health metrics, and actions
 */

interface MailboxListProps {
  onAddMailbox: () => void;
}

export function MailboxList({ onAddMailbox }: MailboxListProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useMailboxes(page, 20);
  const deleteMailbox = useDeleteMailbox();

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}?`)) {
      return;
    }

    try {
      await deleteMailbox.mutateAsync(id);
      toast.success('Mailbox deleted successfully');
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to delete mailbox'
        : 'Failed to delete mailbox';
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">Failed to load mailboxes</p>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </Card>
    );
  }

  const mailboxes = data?.data?.mailboxes || [];

  if (mailboxes.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full bg-gray-100">
            <Mail className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2">No Email Accounts Yet</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Add your first email account to start sending campaigns. Connect via OAuth
          (recommended) or SMTP.
        </p>
        <Button onClick={onAddMailbox}>
          <Mail className="w-4 h-4 mr-2" />
          Add Email Account
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Email Accounts</h3>
          <p className="text-sm text-muted-foreground">
            {data?.data?.total} total {data?.data?.total === 1 ? 'mailbox' : 'mailboxes'}
          </p>
        </div>
        <Button onClick={onAddMailbox}>
          <Mail className="w-4 h-4 mr-2" />
          Add Email Account
        </Button>
      </div>

      {/* Mailbox Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mailboxes.map((mailbox: Mailbox) => (
          <MailboxCard
            key={mailbox.id}
            mailbox={mailbox}
            onDelete={() => handleDelete(mailbox.id, mailbox.email)}
          />
        ))}
      </div>

      {/* Pagination */}
      {data?.data && data.data.total > 20 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page} of {Math.ceil(data.data.total / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(data.data.total / 20)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Individual Mailbox Card
 */
interface MailboxCardProps {
  mailbox: Mailbox;
  onDelete: () => void;
}

function MailboxCard({ mailbox, onDelete }: MailboxCardProps) {
  const statusConfig = {
    ACTIVE: { color: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'Active' },
    WARMING: { color: 'bg-blue-100 text-blue-700', icon: Clock, label: 'Warming' },
    SUSPENDED: { color: 'bg-red-100 text-red-700', icon: AlertCircle, label: 'Suspended' },
    INACTIVE: { color: 'bg-gray-100 text-gray-700', icon: AlertCircle, label: 'Inactive' },
  };

  const status = statusConfig[mailbox.status] || statusConfig.INACTIVE;
  const StatusIcon = status.icon;

  const providerLabel = {
    GMAIL: 'Google',
    OUTLOOK: 'Microsoft',
    SMTP: 'SMTP',
    AWS_SES: 'AWS SES',
  }[mailbox.provider];

  const healthColor =
    mailbox.healthScore >= 80
      ? 'text-green-600'
      : mailbox.healthScore >= 60
      ? 'text-yellow-600'
      : 'text-red-600';

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          <Badge variant="outline" className="text-xs">
            {providerLabel}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${status.color}`}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </div>
        </div>
      </div>

      {/* Email */}
      <p className="font-semibold text-sm mb-1 truncate">{mailbox.email}</p>

      {/* Auth Type */}
      <p className="text-xs text-muted-foreground mb-3">
        {mailbox.hasOAuthToken ? '🔒 OAuth 2.0' : '🔑 SMTP'}
      </p>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-3 pt-3 border-t">
        <div className="text-center">
          <p className={`text-lg font-bold ${healthColor}`}>{mailbox.healthScore}</p>
          <p className="text-xs text-muted-foreground">Health</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-muted-foreground">
            {(mailbox.bounceRate * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">Bounce</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-muted-foreground">
            {mailbox.warmupDaysActive}d
          </p>
          <p className="text-xs text-muted-foreground">Warmup</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t">
        <Button variant="outline" size="sm" className="flex-1" disabled>
          <MoreVertical className="w-4 h-4 mr-1" />
          Manage
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

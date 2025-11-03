'use client';

/**
 * Admin Error Monitoring Dashboard
 *
 * View and manage application errors
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { errorAPI, ErrorLog } from '@/lib/api/endpoints/errors';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Filter,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function ErrorMonitoringPage() {
  const [page, setPage] = useState(1);
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [resolution, setResolution] = useState('');
  const [filters, setFilters] = useState({
    severity: undefined as string | undefined,
    source: undefined as 'frontend' | 'backend' | undefined,
    resolved: false,
  });

  const queryClient = useQueryClient();

  // Fetch errors
  const { data: errorsData, isLoading, refetch } = useQuery({
    queryKey: ['errors', page, filters],
    queryFn: () =>
      errorAPI.getErrors({
        page,
        limit: 20,
        ...filters,
      }),
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['error-stats'],
    queryFn: () => errorAPI.getStats({ days: 7 }),
  });

  // Resolve error mutation
  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      errorAPI.resolveError(id, resolution),
    onSuccess: () => {
      toast.success('Error marked as resolved');
      queryClient.invalidateQueries({ queryKey: ['errors'] });
      queryClient.invalidateQueries({ queryKey: ['error-stats'] });
      setSelectedError(null);
      setResolution('');
    },
    onError: () => {
      toast.error('Failed to resolve error');
    },
  });

  // Unresolve error mutation
  const unresolveMutation = useMutation({
    mutationFn: (id: string) => errorAPI.unresolveError(id),
    onSuccess: () => {
      toast.success('Error reopened');
      queryClient.invalidateQueries({ queryKey: ['errors'] });
      queryClient.invalidateQueries({ queryKey: ['error-stats'] });
    },
    onError: () => {
      toast.error('Failed to reopen error');
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-600 text-white';
      case 'HIGH':
        return 'bg-orange-600 text-white';
      case 'MEDIUM':
        return 'bg-yellow-600 text-white';
      case 'LOW':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const getSourceColor = (source: string) => {
    return source === 'frontend' ? 'bg-purple-600 text-white' : 'bg-green-600 text-white';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Error Monitoring</h1>
          <p className="text-gray-600">Track and manage application errors</p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Errors</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical</p>
                <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High</p>
                <p className="text-2xl font-bold text-orange-600">{stats.high}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Frontend</p>
                <p className="text-2xl font-bold text-purple-600">{stats.bySource.frontend}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Backend</p>
                <p className="text-2xl font-bold text-green-600">{stats.bySource.backend}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filters.severity === undefined ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters({ ...filters, severity: undefined })}
            >
              All Severities
            </Button>
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((severity) => (
              <Button
                key={severity}
                variant={filters.severity === severity ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters({ ...filters, severity })}
              >
                {severity}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant={filters.source === undefined ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters({ ...filters, source: undefined })}
            >
              All Sources
            </Button>
            <Button
              variant={filters.source === 'frontend' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters({ ...filters, source: 'frontend' })}
            >
              Frontend
            </Button>
            <Button
              variant={filters.source === 'backend' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters({ ...filters, source: 'backend' })}
            >
              Backend
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant={!filters.resolved ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters({ ...filters, resolved: false })}
            >
              Unresolved
            </Button>
            <Button
              variant={filters.resolved ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters({ ...filters, resolved: true })}
            >
              Resolved
            </Button>
          </div>
        </div>
      </Card>

      {/* Errors Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Severity</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Occurrences</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading errors...
                </TableCell>
              </TableRow>
            ) : errorsData?.errors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="h-12 w-12 text-green-600" />
                    <p className="text-lg font-semibold">No errors found</p>
                    <p className="text-gray-600">Everything is running smoothly!</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              errorsData?.errors.map((error) => (
                <TableRow key={error.id}>
                  <TableCell>
                    <Badge className={getSeverityColor(error.severity)}>{error.severity}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getSourceColor(error.source)}>{error.source}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="truncate">{error.message}</div>
                    {error.endpoint && (
                      <div className="text-xs text-gray-500">
                        {error.method} {error.endpoint}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {error.category && <Badge variant="outline">{error.category}</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold">{error.occurrenceCount}x</span>
                      <span className="text-xs text-gray-500">
                        {error.affectedUsers} user{error.affectedUsers !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(error.created), 'MMM d, HH:mm')}
                  </TableCell>
                  <TableCell>
                    {error.resolved ? (
                      <Badge className="bg-green-600 text-white">Resolved</Badge>
                    ) : (
                      <Badge className="bg-red-600 text-white">Open</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedError(error)}
                      >
                        View
                      </Button>
                      {error.sentryId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            window.open(`https://sentry.io/issues/${error.sentryId}/`, '_blank')
                          }
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {errorsData && errorsData.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-gray-600">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, errorsData.total)} of{' '}
              {errorsData.total} errors
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= errorsData.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Error Details Dialog */}
      <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
            <DialogDescription>
              {selectedError && format(new Date(selectedError.created), 'PPpp')}
            </DialogDescription>
          </DialogHeader>

          {selectedError && (
            <div className="space-y-4">
              {/* Badges */}
              <div className="flex gap-2">
                <Badge className={getSeverityColor(selectedError.severity)}>
                  {selectedError.severity}
                </Badge>
                <Badge className={getSourceColor(selectedError.source)}>
                  {selectedError.source}
                </Badge>
                {selectedError.category && <Badge variant="outline">{selectedError.category}</Badge>}
              </div>

              {/* Message */}
              <div>
                <h3 className="font-semibold mb-2">Error Message</h3>
                <p className="text-sm bg-gray-50 p-3 rounded">{selectedError.message}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Occurrences</p>
                  <p className="text-lg font-bold">{selectedError.occurrenceCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Affected Users</p>
                  <p className="text-lg font-bold">{selectedError.affectedUsers}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status Code</p>
                  <p className="text-lg font-bold">{selectedError.statusCode || 'N/A'}</p>
                </div>
              </div>

              {/* Stack Trace */}
              {selectedError.stackTrace && (
                <div>
                  <h3 className="font-semibold mb-2">Stack Trace</h3>
                  <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                    {selectedError.stackTrace}
                  </pre>
                </div>
              )}

              {/* Context */}
              {selectedError.context && (
                <div>
                  <h3 className="font-semibold mb-2">Context</h3>
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedError.context, null, 2)}
                  </pre>
                </div>
              )}

              {/* Resolution */}
              {!selectedError.resolved ? (
                <div>
                  <h3 className="font-semibold mb-2">Mark as Resolved</h3>
                  <Textarea
                    placeholder="Describe how this error was resolved..."
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="mb-2"
                  />
                  <Button
                    onClick={() =>
                      resolveMutation.mutate({
                        id: selectedError.id,
                        resolution,
                      })
                    }
                    disabled={!resolution || resolveMutation.isPending}
                  >
                    {resolveMutation.isPending ? 'Resolving...' : 'Mark as Resolved'}
                  </Button>
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold mb-2">Resolution</h3>
                  <p className="text-sm bg-green-50 p-3 rounded mb-2">
                    {selectedError.resolution}
                  </p>
                  <p className="text-xs text-gray-600">
                    Resolved by {selectedError.resolvedBy} on{' '}
                    {selectedError.resolvedAt &&
                      format(new Date(selectedError.resolvedAt), 'PPpp')}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => unresolveMutation.mutate(selectedError.id)}
                    disabled={unresolveMutation.isPending}
                    className="mt-2"
                  >
                    Reopen Error
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

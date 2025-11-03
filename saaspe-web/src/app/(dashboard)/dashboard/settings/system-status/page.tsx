'use client';


export const dynamic = 'force-dynamic';
import { useQuery } from '@tanstack/react-query';
import { healthApi, HealthCheckResponse } from '@/lib/api/endpoints/health';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Database,
  Zap,
  Activity,
  Server,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function SystemStatusPage() {
  const { data: health, isLoading, error } = useQuery<HealthCheckResponse>({
    queryKey: ['system-health'],
    queryFn: healthApi.getDetailedHealth,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-muted-foreground">Loading system status...</p>
        </div>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Failed to fetch system status</AlertTitle>
          <AlertDescription>
            Unable to connect to the backend. The system may be down or experiencing issues.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'destructive' | 'outline' => {
    switch (status) {
      case 'healthy':
        return 'default';
      case 'degraded':
        return 'outline';
      case 'unhealthy':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.join(' ') || '< 1m';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">System Status</h1>
            <p className="text-muted-foreground">
              Real-time monitoring of system health and performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(health.status)}
            <Badge variant={getStatusBadgeVariant(health.status)} className="text-lg px-4 py-1">
              {health.status.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      {/* Critical Issues Alert */}
      {health.tokens.criticalIssues && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Token Issues Detected</AlertTitle>
          <AlertDescription>
            {health.tokens.expiringSoon} token(s) expiring within 24 hours. Automatic refresh may
            have failed. Check e-signature connections.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {/* Uptime Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUptime(health.uptime)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last checked: {formatDistanceToNow(new Date(health.timestamp), { addSuffix: true })}
            </p>
          </CardContent>
        </Card>

        {/* Response Time Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.responseTime}ms</div>
            <Progress
              value={Math.min((health.responseTime / 1000) * 100, 100)}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {health.responseTime < 200 ? 'Excellent' : health.responseTime < 500 ? 'Good' : 'Slow'}
            </p>
          </CardContent>
        </Card>

        {/* Environment Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Environment</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{health.environment}</div>
            <p className="text-xs text-muted-foreground mt-1">Version {health.version}</p>
          </CardContent>
        </Card>
      </div>

      {/* Database Health */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Health
              </CardTitle>
              <CardDescription>PostgreSQL connection status and performance</CardDescription>
            </div>
            {health.database.connected ? (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                Disconnected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Response Time</p>
              <p className="text-2xl font-bold">{health.database.responseTime}ms</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Connections</p>
              <p className="text-2xl font-bold">{health.database.activeConnections}</p>
            </div>
          </div>
          {health.database.error && (
            <Alert variant="destructive" className="mt-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{health.database.error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Provider Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>E-Signature Provider Status</CardTitle>
          <CardDescription>Configured providers and active connections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(health.providers.configured).map(([provider, isConfigured]) => {
              const activeCount = health.providers.activeConnections[provider] || 0;
              return (
                <div
                  key={provider}
                  className={`p-4 border rounded-lg ${isConfigured ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium capitalize">
                      {provider.replace('_', ' ')}
                    </span>
                    {isConfigured ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isConfigured ? (
                      <span>
                        {activeCount} active connection{activeCount !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span>Not configured</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Token Health */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Token Health</CardTitle>
              <CardDescription>OAuth token status and expiration tracking</CardDescription>
            </div>
            {health.tokens.criticalIssues && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Critical Issues
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-3xl font-bold text-blue-600">{health.tokens.total}</p>
              <p className="text-sm text-muted-foreground mt-1">Total</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-3xl font-bold text-green-600">{health.tokens.active}</p>
              <p className="text-sm text-muted-foreground mt-1">Active</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-3xl font-bold text-red-600">{health.tokens.expired}</p>
              <p className="text-sm text-muted-foreground mt-1">Expired</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-3xl font-bold text-orange-600">{health.tokens.expiringSoon}</p>
              <p className="text-sm text-muted-foreground mt-1">Next 24h</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-3xl font-bold text-yellow-600">{health.tokens.expiringThisWeek}</p>
              <p className="text-sm text-muted-foreground mt-1">Next 7 days</p>
            </div>
          </div>
          {health.tokens.expiringSoon > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription>
                {health.tokens.expiringSoon} token(s) expiring soon. Users should reconnect their
                e-signature accounts in Settings → E-Signatures.
              </AlertDescription>
            </Alert>
          )}
          {health.tokens.expiringThisWeek > 0 && health.tokens.expiringSoon === 0 && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>Upcoming Expirations</AlertTitle>
              <AlertDescription>
                {health.tokens.expiringThisWeek} token(s) expiring this week. Automatic refresh will
                handle these proactively.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Auto-refresh notice */}
      <div className="mt-6 text-center text-sm text-muted-foreground">
        <Activity className="h-4 w-4 inline-block mr-1 animate-pulse" />
        Auto-refreshing every 30 seconds
      </div>
    </div>
  );
}

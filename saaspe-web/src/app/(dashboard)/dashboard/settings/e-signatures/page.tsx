'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Shield,
  Check,
  X,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import {
  eSignatureConnectionsApi,
  type ESignatureProvider,
  type ConnectionStatus,
  type ProviderInfo,
} from '@/lib/api/endpoints/e-signature-connections';
import { tenantBrandingApi } from '@/lib/api/endpoints/tenant-branding';
import { useToast } from '@/hooks/use-toast';

export default function ESignatureSettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [connectingProvider, setConnectingProvider] = useState<ESignatureProvider | null>(null);

  // Handle OAuth callback success/error
  useEffect(() => {
    const provider = searchParams.get('provider') as ESignatureProvider | null;
    const status = searchParams.get('status');
    const error = searchParams.get('error');

    if (provider && status === 'connected') {
      toast({
        title: 'Connection successful',
        description: `${getProviderDisplayName(provider)} has been connected successfully.`,
      });
      // Refresh connection statuses
      queryClient.invalidateQueries({ queryKey: ['e-signature-connections'] });
      // Clear URL parameters
      router.replace('/dashboard/settings/e-signatures');
    } else if (error) {
      const errorMessage = error === 'connection_failed'
        ? 'Failed to connect. Please try again.'
        : 'An error occurred during connection.';
      toast({
        title: 'Connection failed',
        description: errorMessage,
        variant: 'destructive',
      });
      // Clear URL parameters
      router.replace('/dashboard/settings/e-signatures');
    }
  }, [searchParams, toast, queryClient, router]);

  // Fetch connection statuses
  const { data: connectionStatuses, isLoading } = useQuery({
    queryKey: ['e-signature-connections'],
    queryFn: eSignatureConnectionsApi.getConnectionStatuses,
  });

  // Fetch tenant branding for default provider
  const { data: tenantBranding, isLoading: isBrandingLoading } = useQuery({
    queryKey: ['tenant-branding'],
    queryFn: tenantBrandingApi.get,
  });

  // Get available providers
  const availableProviders = eSignatureConnectionsApi.getAvailableProviders();

  // Update default provider mutation
  const updateDefaultProviderMutation = useMutation({
    mutationFn: tenantBrandingApi.updateESignatureProvider,
    onSuccess: () => {
      toast({
        title: 'Default provider updated',
        description: 'Your default e-signature provider has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['tenant-branding'] });
    },
    onError: () => {
      toast({
        title: 'Update failed',
        description: 'Failed to update default provider. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: async (provider: ESignatureProvider) => {
      setConnectingProvider(provider);
      const result = await eSignatureConnectionsApi.connectProvider(provider);
      return { provider, url: result.url };
    },
    onSuccess: ({ url }) => {
      // Redirect to OAuth provider
      window.location.href = url;
    },
    onError: (error) => {
      setConnectingProvider(null);
      toast({
        title: 'Connection failed',
        description: 'Failed to initiate connection. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: eSignatureConnectionsApi.disconnectProvider,
    onSuccess: (_, provider) => {
      toast({
        title: 'Disconnected',
        description: `${getProviderDisplayName(provider)} has been disconnected.`,
      });
      queryClient.invalidateQueries({ queryKey: ['e-signature-connections'] });
    },
    onError: () => {
      toast({
        title: 'Disconnection failed',
        description: 'Failed to disconnect provider. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const getConnectionStatus = (provider: ESignatureProvider): ConnectionStatus | undefined => {
    return connectionStatuses?.find((cs) => cs.provider === provider);
  };

  const getProviderDisplayName = (provider: ESignatureProvider): string => {
    const providerInfo = availableProviders.find((p) => p.name === provider);
    return providerInfo?.displayName || provider;
  };

  const handleConnect = (provider: ESignatureProvider) => {
    connectMutation.mutate(provider);
  };

  const handleDisconnect = (provider: ESignatureProvider) => {
    if (confirm(`Are you sure you want to disconnect ${getProviderDisplayName(provider)}?`)) {
      disconnectMutation.mutate(provider);
    }
  };

  const handleSetDefaultProvider = (provider: ESignatureProvider) => {
    const connectionStatus = getConnectionStatus(provider);
    if (!connectionStatus?.isConnected) {
      toast({
        title: 'Provider not connected',
        description: `Please connect ${getProviderDisplayName(provider)} before setting it as default.`,
        variant: 'destructive',
      });
      return;
    }
    updateDefaultProviderMutation.mutate(provider);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">E-Signature Connections</h1>
          <p className="text-gray-500 mt-2">
            Connect your e-signature provider accounts to send proposals for signing
          </p>
        </div>
        <Link href="/dashboard/settings/e-signatures/analytics">
          <Button variant="outline" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            View Analytics
          </Button>
        </Link>
      </div>

      {/* Info Alert */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Your credentials are encrypted and stored securely. We use OAuth 2.0 for authentication
          and never store your password.
        </AlertDescription>
      </Alert>

      {/* Default Provider Selection */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">Default E-Signature Provider</CardTitle>
          <CardDescription>
            Choose which provider to use when sending proposals for e-signature
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {availableProviders.map((provider) => {
              const connectionStatus = getConnectionStatus(provider.name);
              const isConnected = connectionStatus?.isConnected || false;
              const isDefault = tenantBranding?.eSignatureProvider === provider.name;
              const isUpdating = updateDefaultProviderMutation.isPending;

              return (
                <button
                  key={provider.name}
                  onClick={() => handleSetDefaultProvider(provider.name)}
                  disabled={!isConnected || isUpdating || isDefault}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all
                    ${
                      isDefault
                        ? 'border-blue-600 bg-blue-100 shadow-md'
                        : isConnected
                        ? 'border-gray-300 bg-white hover:border-blue-400 hover:shadow-sm'
                        : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                    }
                  `}
                >
                  {isDefault && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-blue-600 text-white">Default</Badge>
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold ${
                        isDefault
                          ? 'bg-gradient-to-br from-blue-600 to-purple-700'
                          : 'bg-gradient-to-br from-blue-500 to-purple-600'
                      }`}
                    >
                      {provider.displayName[0]}
                    </div>
                    <div className="text-sm font-semibold text-gray-900">{provider.displayName}</div>
                    {!isConnected && (
                      <div className="text-xs text-red-600 font-medium">Not Connected</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {availableProviders.map((provider) => {
          const connectionStatus = getConnectionStatus(provider.name);
          const isConnected = connectionStatus?.isConnected || false;
          const isConnecting = connectingProvider === provider.name;
          const isDisconnecting = disconnectMutation.isPending;

          return (
            <Card key={provider.name} className="relative overflow-hidden">
              {/* Connection Status Badge */}
              <div className="absolute top-4 right-4">
                {isConnected ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-50 text-gray-600">
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Connected
                  </Badge>
                )}
              </div>

              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                    {provider.displayName[0]}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{provider.displayName}</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {provider.pricing}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">{provider.description}</p>

                {/* Connection Details */}
                {isConnected && connectionStatus && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center text-sm">
                      <span className="text-gray-600 mr-2">Account:</span>
                      <span className="font-medium text-gray-900">
                        {connectionStatus.connectedEmail || 'Connected'}
                      </span>
                    </div>
                    {connectionStatus.connectedAt && (
                      <div className="flex items-center text-sm">
                        <span className="text-gray-600 mr-2">Connected:</span>
                        <span className="text-gray-900">
                          {new Date(connectionStatus.connectedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                {/* Features */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Key Features</h4>
                  <ul className="space-y-1.5">
                    {provider.features.slice(0, 4).map((feature, idx) => (
                      <li key={idx} className="flex items-start text-sm text-gray-600">
                        <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Pros & Cons */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <h5 className="text-xs font-semibold text-gray-700 mb-1.5">Pros</h5>
                    <ul className="space-y-1">
                      {provider.pros.slice(0, 2).map((pro, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex items-start">
                          <Check className="h-3 w-3 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-gray-700 mb-1.5">Cons</h5>
                    <ul className="space-y-1">
                      {provider.cons.slice(0, 2).map((con, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex items-start">
                          <X className="h-3 w-3 text-red-600 mr-1 mt-0.5 flex-shrink-0" />
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Separator />

                {/* Best For */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-900">
                    <span className="font-semibold">Best for:</span> {provider.bestFor}
                  </p>
                </div>

                {/* Action Button */}
                <div className="pt-2">
                  {isConnected ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleDisconnect(provider.name)}
                      disabled={isDisconnecting}
                    >
                      {isDisconnecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Disconnecting...
                        </>
                      ) : (
                        'Disconnect'
                      )}
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      onClick={() => handleConnect(provider.name)}
                      disabled={isConnecting}
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          Connect {provider.displayName}
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Help Section */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <AlertCircle className="h-5 w-5 mr-2 text-blue-600" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start">
            <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">
              1
            </div>
            <p>
              <span className="font-semibold">Connect your account:</span> Click "Connect" to
              authenticate with your chosen e-signature provider using OAuth 2.0.
            </p>
          </div>
          <div className="flex items-start">
            <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">
              2
            </div>
            <p>
              <span className="font-semibold">Grant permissions:</span> Authorize SaasPE to send
              documents for signature on your behalf.
            </p>
          </div>
          <div className="flex items-start">
            <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">
              3
            </div>
            <p>
              <span className="font-semibold">Send proposals:</span> Once connected, you can send
              proposals with e-signature directly from the proposal detail page.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

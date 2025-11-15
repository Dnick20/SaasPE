export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number; // seconds
  version: string;
  environment: string;
  responseTime: number; // milliseconds
  database: DatabaseHealth;
  providers: ProviderHealth;
  tokens: TokenHealth;
}

export interface DatabaseHealth {
  connected: boolean;
  responseTime: number; // milliseconds
  activeConnections: number;
  error?: string;
}

export interface ProviderHealth {
  configured: Record<string, boolean>; // provider -> is configured
  activeConnections: Record<string, number>; // provider -> connection count
}

export interface TokenHealth {
  total: number; // Total connections
  active: number; // Active connections with valid tokens
  expired: number; // Expired tokens
  expiringSoon: number; // Expiring in next 24 hours (CRITICAL)
  expiringThisWeek: number; // Expiring in next 7 days (WARNING)
  criticalIssues: boolean; // True if any tokens expiring in 24h
}

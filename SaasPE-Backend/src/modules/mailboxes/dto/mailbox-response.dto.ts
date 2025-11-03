export class MailboxResponseDto {
  id: string;
  tenantId: string;
  userId: string;
  email: string;
  type: string;
  provider: string;
  status: string;

  // OAuth metadata (no tokens)
  oauthProvider?: string;
  oauthTokenExpiry?: Date;
  oauthScopes?: string[];
  hasOAuthToken: boolean;

  // SMTP metadata (no password)
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpUseSsl?: boolean;

  // AWS SES metadata
  awsSesIdentity?: string;
  awsSesRegion?: string;
  dedicatedIp?: string;

  // Warmup settings
  warmupStatus: string;
  warmupDaysActive: number;
  warmupCurrentLimit: number;
  warmupTargetLimit: number;

  // Health metrics
  healthScore: number;
  bounceRate: number;
  complaintRate: number;

  // Timestamps
  created: Date;
  updated: Date;

  // Omit sensitive fields like passwords and tokens
  constructor(mailbox: any) {
    this.id = mailbox.id;
    this.tenantId = mailbox.tenantId;
    this.userId = mailbox.userId;
    this.email = mailbox.email;
    this.type = mailbox.type;
    this.provider = mailbox.provider;
    this.status = mailbox.status;

    // OAuth metadata (tokens are omitted for security)
    this.oauthProvider = mailbox.oauthProvider;
    this.oauthTokenExpiry = mailbox.oauthTokenExpiry;
    this.oauthScopes = mailbox.oauthScopes;
    this.hasOAuthToken = !!mailbox.oauthRefreshToken;

    // SMTP metadata (password is omitted)
    this.smtpHost = mailbox.smtpHost;
    this.smtpPort = mailbox.smtpPort;
    this.smtpUsername = mailbox.smtpUsername;
    this.smtpUseSsl = mailbox.smtpUseSsl;

    // AWS SES metadata
    this.awsSesIdentity = mailbox.awsSesIdentity;
    this.awsSesRegion = mailbox.awsSesRegion;
    this.dedicatedIp = mailbox.dedicatedIp;

    // Warmup settings
    this.warmupStatus = mailbox.warmupStatus;
    this.warmupDaysActive = mailbox.warmupDaysActive;
    this.warmupCurrentLimit = mailbox.warmupCurrentLimit;
    this.warmupTargetLimit = mailbox.warmupTargetLimit;

    // Health metrics
    this.healthScore = mailbox.healthScore;
    this.bounceRate = mailbox.bounceRate;
    this.complaintRate = mailbox.complaintRate;

    // Timestamps
    this.created = mailbox.created;
    this.updated = mailbox.updated;
  }
}

export class MailboxListResponseDto {
  mailboxes: MailboxResponseDto[];
  total: number;
  page: number;
  limit: number;
}

import { Injectable, Logger } from '@nestjs/common';
import {
  CloudWatchClient,
  PutMetricDataCommand,
  PutMetricDataInput,
  MetricDatum,
} from '@aws-sdk/client-cloudwatch';

/**
 * AWS CloudWatch Service
 *
 * Tracks custom metrics for the Email Account Management feature:
 * - OAuth success/failure rates
 * - Bulk import job metrics
 * - Mailbox health scores
 * - Token refresh failures
 *
 * Metrics are used for:
 * - Real-time monitoring dashboards
 * - Automated alerting (via CloudWatch Alarms)
 * - Performance optimization
 * - SLA tracking
 */
@Injectable()
export class CloudWatchService {
  private readonly logger = new Logger(CloudWatchService.name);
  private readonly client: CloudWatchClient;
  private readonly namespace: string;
  private readonly enabled: boolean;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    this.namespace = process.env.CLOUDWATCH_NAMESPACE || 'SaasPE/EmailAccounts';
    this.enabled = process.env.CLOUDWATCH_ENABLED !== 'false';

    this.client = new CloudWatchClient({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    this.logger.log(
      `CloudWatchService initialized (namespace: ${this.namespace}, enabled: ${this.enabled})`,
    );
  }

  /**
   * Track OAuth flow failure
   *
   * @param provider - OAuth provider ('google' | 'microsoft')
   * @param reason - Failure reason (error message)
   * @param tenantId - Optional tenant ID for filtering
   *
   * Example:
   * ```ts
   * await cloudwatch.trackOAuthFailure('google', 'invalid_grant');
   * ```
   */
  async trackOAuthFailure(
    provider: 'google' | 'microsoft',
    reason: string,
    tenantId?: string,
  ): Promise<void> {
    if (!this.enabled) {
      this.logger.debug('CloudWatch metrics disabled');
      return;
    }

    try {
      const dimensions = [
        { Name: 'Provider', Value: provider },
        { Name: 'Reason', Value: reason },
      ];

      if (tenantId) {
        dimensions.push({ Name: 'TenantId', Value: tenantId });
      }

      await this.putMetric({
        MetricName: 'OAuthFailures',
        Value: 1,
        Unit: 'Count',
        Dimensions: dimensions,
      });

      this.logger.log(`Tracked OAuth failure: ${provider} - ${reason}`);
    } catch (error) {
      this.logger.error(
        `Failed to track OAuth failure: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Track OAuth flow success
   *
   * @param provider - OAuth provider ('google' | 'microsoft')
   * @param durationMs - Time taken for OAuth flow (ms)
   * @param tenantId - Optional tenant ID for filtering
   *
   * Example:
   * ```ts
   * await cloudwatch.trackOAuthSuccess('google', 3500);
   * ```
   */
  async trackOAuthSuccess(
    provider: 'google' | 'microsoft',
    durationMs: number,
    tenantId?: string,
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const dimensions: Array<{ Name: string; Value: string }> = [
        { Name: 'Provider', Value: provider },
      ];

      if (tenantId) {
        dimensions.push({ Name: 'TenantId', Value: tenantId });
      }

      await this.putMetric({
        MetricName: 'OAuthSuccesses',
        Value: 1,
        Unit: 'Count',
        Dimensions: dimensions,
      });

      await this.putMetric({
        MetricName: 'OAuthDuration',
        Value: durationMs,
        Unit: 'Milliseconds',
        Dimensions: dimensions,
      });

      this.logger.log(`Tracked OAuth success: ${provider} (${durationMs}ms)`);
    } catch (error) {
      this.logger.error(
        `Failed to track OAuth success: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Track bulk import job metrics
   *
   * @param jobId - Job ID
   * @param totalRows - Total rows in import
   * @param successfulRows - Successfully imported rows
   * @param failedRows - Failed rows
   * @param durationMs - Job duration (ms)
   * @param tenantId - Optional tenant ID
   *
   * Example:
   * ```ts
   * await cloudwatch.trackBulkImportMetrics(
   *   'job-123',
   *   100,
   *   95,
   *   5,
   *   45000
   * );
   * ```
   */
  async trackBulkImportMetrics(
    jobId: string,
    totalRows: number,
    successfulRows: number,
    failedRows: number,
    durationMs: number,
    tenantId?: string,
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const dimensions = [{ Name: 'JobId', Value: jobId }];

      if (tenantId) {
        dimensions.push({ Name: 'TenantId', Value: tenantId });
      }

      const successRate =
        totalRows > 0 ? (successfulRows / totalRows) * 100 : 0;

      const metrics: MetricDatum[] = [
        {
          MetricName: 'BulkImportJobDuration',
          Value: durationMs,
          Unit: 'Milliseconds',
          Dimensions: dimensions,
        },
        {
          MetricName: 'BulkImportSuccessRate',
          Value: successRate,
          Unit: 'Percent',
          Dimensions: dimensions,
        },
        {
          MetricName: 'BulkImportTotalRows',
          Value: totalRows,
          Unit: 'Count',
          Dimensions: dimensions,
        },
        {
          MetricName: 'BulkImportSuccessfulRows',
          Value: successfulRows,
          Unit: 'Count',
          Dimensions: dimensions,
        },
        {
          MetricName: 'BulkImportFailedRows',
          Value: failedRows,
          Unit: 'Count',
          Dimensions: dimensions,
        },
      ];

      await this.putMetrics(metrics);

      this.logger.log(
        `Tracked bulk import metrics: ${successfulRows}/${totalRows} successful (${durationMs}ms)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to track bulk import metrics: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Track mailbox health score change
   *
   * @param mailboxId - Mailbox ID
   * @param healthScore - New health score (0-100)
   * @param bounceRate - Bounce rate (0-1)
   * @param complaintRate - Complaint rate (0-1)
   *
   * Example:
   * ```ts
   * await cloudwatch.trackMailboxHealth('mailbox-123', 95, 0.02, 0.001);
   * ```
   */
  async trackMailboxHealth(
    mailboxId: string,
    healthScore: number,
    bounceRate: number,
    complaintRate: number,
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const metrics: MetricDatum[] = [
        {
          MetricName: 'MailboxHealthScore',
          Value: healthScore,
          Unit: 'None',
          Dimensions: [{ Name: 'MailboxId', Value: mailboxId }],
        },
        {
          MetricName: 'MailboxBounceRate',
          Value: bounceRate * 100, // Convert to percentage
          Unit: 'Percent',
          Dimensions: [{ Name: 'MailboxId', Value: mailboxId }],
        },
        {
          MetricName: 'MailboxComplaintRate',
          Value: complaintRate * 100, // Convert to percentage
          Unit: 'Percent',
          Dimensions: [{ Name: 'MailboxId', Value: mailboxId }],
        },
      ];

      await this.putMetrics(metrics);

      this.logger.log(
        `Tracked mailbox health: ${mailboxId} (score: ${healthScore})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to track mailbox health: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Track token refresh failure
   *
   * @param mailboxId - Mailbox ID
   * @param provider - OAuth provider
   * @param reason - Failure reason
   *
   * Example:
   * ```ts
   * await cloudwatch.trackTokenRefreshFailure('mailbox-123', 'google', 'token_expired');
   * ```
   */
  async trackTokenRefreshFailure(
    mailboxId: string,
    provider: string,
    reason: string,
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      await this.putMetric({
        MetricName: 'TokenRefreshFailures',
        Value: 1,
        Unit: 'Count',
        Dimensions: [
          { Name: 'MailboxId', Value: mailboxId },
          { Name: 'Provider', Value: provider },
          { Name: 'Reason', Value: reason },
        ],
      });

      this.logger.log(
        `Tracked token refresh failure: ${mailboxId} - ${reason}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to track token refresh failure: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Put a single metric to CloudWatch
   *
   * @param metric - Metric data
   * @private
   */
  private async putMetric(
    metric: Omit<MetricDatum, 'Timestamp'>,
  ): Promise<void> {
    const input: PutMetricDataInput = {
      Namespace: this.namespace,
      MetricData: [
        {
          ...metric,
          Timestamp: new Date(),
        },
      ],
    };

    const command = new PutMetricDataCommand(input);
    await this.client.send(command);
  }

  /**
   * Put multiple metrics to CloudWatch (batch)
   *
   * @param metrics - Array of metric data
   * @private
   */
  private async putMetrics(
    metrics: Omit<MetricDatum, 'Timestamp'>[],
  ): Promise<void> {
    const input: PutMetricDataInput = {
      Namespace: this.namespace,
      MetricData: metrics.map((metric) => ({
        ...metric,
        Timestamp: new Date(),
      })),
    };

    const command = new PutMetricDataCommand(input);
    await this.client.send(command);
  }

  /**
   * Track generic custom metric
   *
   * @param metricName - Metric name
   * @param value - Metric value
   * @param unit - Metric unit
   * @param dimensions - Optional dimensions
   *
   * Example:
   * ```ts
   * await cloudwatch.trackCustomMetric('MailboxCreated', 1, 'Count', {
   *   TenantId: 'tenant-123',
   *   Provider: 'google'
   * });
   * ```
   */
  async trackCustomMetric(
    metricName: string,
    value: number,
    unit: string,
    dimensions?: Record<string, string>,
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const dims = dimensions
        ? Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value }))
        : [];

      await this.putMetric({
        MetricName: metricName,
        Value: value,
        Unit: unit as any,
        Dimensions: dims,
      });

      this.logger.log(
        `Tracked custom metric: ${metricName} = ${value} ${unit}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to track custom metric: ${error.message}`,
        error.stack,
      );
    }
  }
}

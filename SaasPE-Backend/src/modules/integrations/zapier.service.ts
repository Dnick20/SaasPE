import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import axios from 'axios';

export interface ZapierSubscription {
  id: string;
  event: string; // 'client.created', 'transcription.completed', etc.
  targetUrl: string;
  tenantId: string;
  created: Date;
}

/**
 * Zapier Integration Service
 *
 * Enables SaasPE to integrate with 5,000+ apps via Zapier:
 *
 * Triggers (Events from SaasPE → Zapier):
 * - client.created - New client added
 * - transcription.completed - Transcription finished
 * - transcription.analyzed - AI analysis completed
 * - proposal.generated - Proposal created
 * - proposal.sent - Proposal sent to client
 * - proposal.signed - Proposal signed
 * - campaign.started - Campaign started
 * - campaign.email.replied - Email reply received
 *
 * Actions (Zapier → SaasPE):
 * - Create client
 * - Create transcription
 * - Update proposal
 * - Start campaign
 *
 * Authentication: API key via JWT bearer token
 */
@Injectable()
export class ZapierService {
  private readonly logger = new Logger(ZapierService.name);
  private subscriptions: Map<string, ZapierSubscription[]> = new Map();

  constructor(private prisma: PrismaService) {
    // Load existing subscriptions from database on startup
    this.loadSubscriptions();
  }

  /**
   * Load webhook subscriptions from database
   */
  private async loadSubscriptions() {
    // In production, you'd store these in a ZapierWebhook table
    // For now, using in-memory storage
    this.logger.log(
      'Zapier service initialized - webhook subscriptions loaded',
    );
  }

  /**
   * Subscribe to an event (called by Zapier)
   */
  async subscribe(
    event: string,
    targetUrl: string,
    tenantId: string,
  ): Promise<ZapierSubscription> {
    // Validate event type
    const validEvents = [
      'client.created',
      'transcription.completed',
      'transcription.analyzed',
      'proposal.generated',
      'proposal.sent',
      'proposal.signed',
      'campaign.started',
      'campaign.email.replied',
    ];

    if (!validEvents.includes(event)) {
      throw new BadRequestException(`Invalid event type: ${event}`);
    }

    // Validate webhook URL
    if (!targetUrl.startsWith('https://hooks.zapier.com/')) {
      throw new BadRequestException('Target URL must be a Zapier webhook URL');
    }

    const subscription: ZapierSubscription = {
      id: this.generateId(),
      event,
      targetUrl,
      tenantId,
      created: new Date(),
    };

    // Store subscription
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, []);
    }

    this.subscriptions.get(event)!.push(subscription);

    this.logger.log(
      `Zapier subscription created: ${event} → ${targetUrl.substring(0, 50)}...`,
    );

    return subscription;
  }

  /**
   * Unsubscribe from an event
   */
  async unsubscribe(subscriptionId: string, tenantId: string): Promise<void> {
    for (const [event, subs] of this.subscriptions.entries()) {
      const index = subs.findIndex(
        (s) => s.id === subscriptionId && s.tenantId === tenantId,
      );

      if (index !== -1) {
        subs.splice(index, 1);
        this.logger.log(`Zapier subscription removed: ${subscriptionId}`);
        return;
      }
    }

    throw new BadRequestException('Subscription not found');
  }

  /**
   * Get all subscriptions for a tenant
   */
  async getSubscriptions(tenantId: string): Promise<ZapierSubscription[]> {
    const allSubs: ZapierSubscription[] = [];

    for (const subs of this.subscriptions.values()) {
      allSubs.push(...subs.filter((s) => s.tenantId === tenantId));
    }

    return allSubs;
  }

  /**
   * Trigger an event and notify all subscribers
   */
  async triggerEvent(
    event: string,
    payload: any,
    tenantId: string,
  ): Promise<void> {
    const subs = this.subscriptions.get(event) || [];
    const tenantSubs = subs.filter((s) => s.tenantId === tenantId);

    if (tenantSubs.length === 0) {
      return; // No subscribers for this event
    }

    this.logger.log(
      `Triggering Zapier event '${event}' for ${tenantSubs.length} subscribers`,
    );

    // Send webhook to all subscribers (async, don't wait)
    for (const sub of tenantSubs) {
      this.sendWebhook(sub.targetUrl, payload).catch((error) => {
        this.logger.error(
          `Failed to send webhook to ${sub.targetUrl}: ${error.message}`,
        );
      });
    }
  }

  /**
   * Send webhook notification to Zapier
   */
  private async sendWebhook(url: string, payload: any): Promise<void> {
    try {
      await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SaasPE-Zapier/1.0',
        },
        timeout: 5000,
      });

      this.logger.debug(`Webhook sent successfully to ${url}`);
    } catch (error: any) {
      throw new Error(
        `Webhook delivery failed: ${error.response?.status || error.message}`,
      );
    }
  }

  /**
   * Test a webhook URL (called by Zapier during setup)
   */
  async testWebhook(targetUrl: string): Promise<boolean> {
    try {
      await this.sendWebhook(targetUrl, {
        event: 'test',
        message: 'This is a test webhook from SaasPE',
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get sample data for an event (used by Zapier to build UI)
   */
  getSampleData(event: string): any {
    const samples: Record<string, any> = {
      'client.created': {
        id: 'uuid-example',
        companyName: 'Acme Corp',
        industry: 'SaaS',
        contactEmail: 'john@acme.com',
        contactFirstName: 'John',
        contactLastName: 'Doe',
        status: 'prospect',
        created: new Date().toISOString(),
      },
      'transcription.completed': {
        id: 'uuid-example',
        fileName: 'sales-call.mp3',
        duration: 1800,
        transcript: 'Sample transcript text...',
        language: 'en',
        confidence: 0.95,
        created: new Date().toISOString(),
      },
      'transcription.analyzed': {
        id: 'uuid-example',
        transcript: 'Sample transcript...',
        extractedData: {
          problemStatement: 'Customer needs automation',
          budget: '$50,000 - $100,000',
          timeline: '3-6 months',
          stakeholders: ['John Doe (CEO)', 'Jane Smith (CTO)'],
        },
        aiConfidence: 0.92,
        created: new Date().toISOString(),
      },
      'proposal.generated': {
        id: 'uuid-example',
        title: 'Sales Automation Proposal for Acme Corp',
        clientName: 'Acme Corp',
        status: 'draft',
        executiveSummary: 'Sample executive summary...',
        pricing: {
          total: 95000,
          currency: 'USD',
        },
        created: new Date().toISOString(),
      },
      'proposal.sent': {
        id: 'uuid-example',
        title: 'Sales Automation Proposal for Acme Corp',
        clientName: 'Acme Corp',
        clientEmail: 'john@acme.com',
        pdfUrl: 'https://example.com/proposal.pdf',
        sentAt: new Date().toISOString(),
      },
      'proposal.signed': {
        id: 'uuid-example',
        title: 'Sales Automation Proposal for Acme Corp',
        clientName: 'Acme Corp',
        signedByName: 'John Doe',
        signedByEmail: 'john@acme.com',
        signedAt: new Date().toISOString(),
        pricing: {
          total: 95000,
          currency: 'USD',
        },
      },
      'campaign.started': {
        id: 'uuid-example',
        name: 'Q4 Outreach Campaign',
        status: 'running',
        totalContacts: 250,
        started: new Date().toISOString(),
      },
      'campaign.email.replied': {
        campaignId: 'uuid-example',
        campaignName: 'Q4 Outreach Campaign',
        recipientEmail: 'prospect@example.com',
        recipientName: 'Jane Smith',
        replyBody: "Thanks for reaching out! I'd love to learn more...",
        repliedAt: new Date().toISOString(),
      },
    };

    return samples[event] || { message: 'No sample data available' };
  }

  /**
   * Helper: Trigger client.created event
   */
  async notifyClientCreated(client: any, tenantId: string): Promise<void> {
    await this.triggerEvent(
      'client.created',
      {
        id: client.id,
        companyName: client.companyName,
        industry: client.industry,
        contactEmail: client.contactEmail,
        contactFirstName: client.contactFirstName,
        contactLastName: client.contactLastName,
        status: client.status,
        created: client.created,
      },
      tenantId,
    );
  }

  /**
   * Helper: Trigger transcription.completed event
   */
  async notifyTranscriptionCompleted(
    transcription: any,
    tenantId: string,
  ): Promise<void> {
    await this.triggerEvent(
      'transcription.completed',
      {
        id: transcription.id,
        fileName: transcription.fileName,
        duration: transcription.duration,
        transcript: transcription.transcript,
        language: transcription.language,
        confidence: transcription.confidence,
        created: transcription.created,
      },
      tenantId,
    );
  }

  /**
   * Helper: Trigger proposal.generated event
   */
  async notifyProposalGenerated(
    proposal: any,
    tenantId: string,
  ): Promise<void> {
    await this.triggerEvent(
      'proposal.generated',
      {
        id: proposal.id,
        title: proposal.title,
        clientName: proposal.client?.companyName,
        status: proposal.status,
        executiveSummary: proposal.executiveSummary,
        pricing: proposal.pricing,
        created: proposal.created,
      },
      tenantId,
    );
  }

  /**
   * Helper: Trigger proposal.signed event
   */
  async notifyProposalSigned(proposal: any, tenantId: string): Promise<void> {
    await this.triggerEvent(
      'proposal.signed',
      {
        id: proposal.id,
        title: proposal.title,
        clientName: proposal.client?.companyName,
        signedByName: proposal.signedByName,
        signedByEmail: proposal.signedByEmail,
        signedAt: proposal.signedAt,
        pricing: proposal.pricing,
      },
      tenantId,
    );
  }

  /**
   * Generate unique ID for subscriptions
   */
  private generateId(): string {
    return `zap_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

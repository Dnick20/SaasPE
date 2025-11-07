import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardMetrics(tenantId: string) {
    const now = new Date();
    const lastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate(),
    );

    // Get current totals
    const [
      totalClients,
      activeProposals,
      totalTranscriptions,
      campaignsSent,
      allCampaigns,
      clientsThisMonth,
      proposalsThisMonth,
      transcriptionsThisMonth,
    ] = await Promise.all([
      this.prisma.client.count({ where: { tenantId } }),
      this.prisma.proposal.count({
        where: { tenantId, status: { in: ['draft', 'ready', 'sent'] } },
      }),
      this.prisma.transcription.count({ where: { tenantId } }),
      this.prisma.campaign.aggregate({
        where: { tenantId },
        _sum: { sentCount: true },
      }),
      this.prisma.campaign.findMany({
        where: { tenantId },
        select: { sentCount: true, repliedCount: true },
      }),
      this.prisma.client.count({
        where: { tenantId, created: { gte: lastMonth } },
      }),
      this.prisma.proposal.count({
        where: { tenantId, created: { gte: lastMonth } },
      }),
      this.prisma.transcription.count({
        where: { tenantId, created: { gte: lastMonth } },
      }),
    ]);

    const twoMonthsAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 2,
      now.getDate(),
    );
    const [clientsLastMonth, proposalsLastMonth, transcriptionsLastMonth] =
      await Promise.all([
        this.prisma.client.count({
          where: { tenantId, created: { gte: twoMonthsAgo, lt: lastMonth } },
        }),
        this.prisma.proposal.count({
          where: { tenantId, created: { gte: twoMonthsAgo, lt: lastMonth } },
        }),
        this.prisma.transcription.count({
          where: { tenantId, created: { gte: twoMonthsAgo, lt: lastMonth } },
        }),
      ]);

    const totalSent = campaignsSent._sum.sentCount || 0;
    const totalReplied = allCampaigns.reduce(
      (sum, c) => sum + (c.repliedCount || 0),
      0,
    );
    const responseRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0;

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      totalClients,
      activeProposals,
      totalTranscriptions,
      campaignsSent: totalSent,
      responseRate,
      aiCostsThisMonth: 0,
      clientsThisMonth,
      proposalsThisMonth,
      transcriptionsThisMonth,
      changes: {
        clients: calculateChange(clientsThisMonth, clientsLastMonth),
        proposals: calculateChange(proposalsThisMonth, proposalsLastMonth),
        transcriptions: calculateChange(
          transcriptionsThisMonth,
          transcriptionsLastMonth,
        ),
        campaigns: 0,
        responseRate: 0,
      },
    };
  }

  async getActivity(tenantId: string, limit: number = 10) {
    const [clients, proposals, transcriptions, campaigns] = await Promise.all([
      this.prisma.client.findMany({
        where: { tenantId },
        orderBy: { created: 'desc' },
        take: limit,
        select: { id: true, companyName: true, created: true },
      }),
      this.prisma.proposal.findMany({
        where: { tenantId },
        orderBy: { created: 'desc' },
        take: limit,
        select: { id: true, title: true, created: true, status: true },
      }),
      this.prisma.transcription.findMany({
        where: { tenantId },
        orderBy: { created: 'desc' },
        take: limit,
        select: { id: true, fileName: true, created: true, analyzed: true },
      }),
      this.prisma.campaign.findMany({
        where: { tenantId },
        orderBy: { created: 'desc' },
        take: limit,
        select: { id: true, name: true, created: true, status: true },
      }),
    ]);

    const activities = [
      ...clients.map((c) => ({
        id: c.id,
        type: 'client_created' as const,
        description: `New client added: ${c.companyName}`,
        timestamp: c.created.toISOString(),
      })),
      ...proposals.map((p) => ({
        id: p.id,
        type: 'proposal_generated' as const,
        description: `Proposal ${p.status}: ${p.title}`,
        timestamp: p.created.toISOString(),
      })),
      ...transcriptions.map((t) => ({
        id: t.id,
        type: 'transcription_analyzed' as const,
        description: t.analyzed
          ? `Transcription analyzed: ${t.fileName}`
          : `Transcription uploaded: ${t.fileName}`,
        timestamp: t.created.toISOString(),
      })),
      ...campaigns.map((c) => ({
        id: c.id,
        type: 'campaign_sent' as const,
        description: `Campaign ${c.status}: ${c.name}`,
        timestamp: c.created.toISOString(),
      })),
    ];

    return activities
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, limit);
  }

  async getMetrics(tenantId: string, startDate?: string, endDate?: string) {
    const dateFilter: any = { tenantId };
    if (startDate || endDate) {
      dateFilter.created = {};
      if (startDate) dateFilter.created.gte = new Date(startDate);
      if (endDate) dateFilter.created.lte = new Date(endDate);
    }

    const [
      totalClients,
      totalProposals,
      totalTranscriptions,
      totalCampaigns,
      campaigns,
    ] = await Promise.all([
      this.prisma.client.count({ where: dateFilter }),
      this.prisma.proposal.count({ where: dateFilter }),
      this.prisma.transcription.count({ where: dateFilter }),
      this.prisma.campaign.count({ where: dateFilter }),
      this.prisma.campaign.findMany({
        where: dateFilter,
        select: { sentCount: true, repliedCount: true },
      }),
    ]);

    const totalSent = campaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0);
    const totalReplied = campaigns.reduce(
      (sum, c) => sum + (c.repliedCount || 0),
      0,
    );
    const averageResponseRate =
      totalSent > 0 ? (totalReplied / totalSent) * 100 : 0;

    const timeSeriesData = await this.getTimeSeriesData(
      tenantId,
      startDate,
      endDate,
    );

    return {
      totalClients,
      totalProposals,
      totalTranscriptions,
      totalCampaigns,
      averageResponseRate,
      totalAiCosts: 0,
      aiCostsBreakdown: { proposals: 0, transcriptions: 0, keyMoments: 0 },
      timeSeriesData,
    };
  }

  private async getTimeSeriesData(
    tenantId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    const daysDiff = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );

    const dateMap = new Map();
    for (let i = 0; i <= daysDiff; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, {
        date: dateStr,
        clients: 0,
        proposals: 0,
        campaigns: 0,
      });
    }

    return Array.from(dateMap.values());
  }

  async getAiCosts(tenantId: string, startDate?: string, endDate?: string) {
    const dateFilter: any = { tenantId };
    if (startDate || endDate) {
      dateFilter.created = {};
      if (startDate) dateFilter.created.gte = new Date(startDate);
      if (endDate) dateFilter.created.lte = new Date(endDate);
    }

    const proposals = await this.prisma.proposal.findMany({
      where: dateFilter,
      select: { aiCost: true },
    });
    const totalCost = proposals.reduce((sum, p) => sum + (p.aiCost || 0), 0);

    return {
      totalCost,
      breakdown: { proposals: totalCost, transcriptions: 0, keyMoments: 0 },
    };
  }

  /**
   * Get comprehensive campaign analytics
   */
  async getCampaignAnalytics(
    tenantId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const dateFilter: any = {
      tenantId,
    };

    if (startDate || endDate) {
      dateFilter.created = {};
      if (startDate) dateFilter.created.gte = new Date(startDate);
      if (endDate) dateFilter.created.lte = new Date(endDate);
    }

    // Get all campaigns for the tenant
    const campaigns = await this.prisma.campaign.findMany({
      where: dateFilter,
      select: {
        id: true,
        name: true,
        status: true,
        sentCount: true,
        openedCount: true,
        clickedCount: true,
        repliedCount: true,
        bouncedCount: true,
        totalContacts: true,
        created: true,
      },
    });

    // Calculate aggregate metrics
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(
      (c) => c.status === 'running',
    ).length;
    const completedCampaigns = campaigns.filter(
      (c) => c.status === 'completed',
    ).length;

    const totalSent = campaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0);
    const totalOpened = campaigns.reduce(
      (sum, c) => sum + (c.openedCount || 0),
      0,
    );
    const totalClicked = campaigns.reduce(
      (sum, c) => sum + (c.clickedCount || 0),
      0,
    );
    const totalReplied = campaigns.reduce(
      (sum, c) => sum + (c.repliedCount || 0),
      0,
    );
    const totalBounced = campaigns.reduce(
      (sum, c) => sum + (c.bouncedCount || 0),
      0,
    );
    const totalContacts = campaigns.reduce(
      (sum, c) => sum + (c.totalContacts || 0),
      0,
    );

    const openRate =
      totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(2) : '0.00';
    const clickRate =
      totalOpened > 0
        ? ((totalClicked / totalOpened) * 100).toFixed(2)
        : '0.00';
    const replyRate =
      totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(2) : '0.00';
    const bounceRate =
      totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(2) : '0.00';

    // Get reply classification breakdown
    const replyClassifications = await this.prisma.campaignEmail.groupBy({
      by: ['replyClassification'],
      where: {
        campaign: {
          tenantId,
        },
        status: 'replied',
        ...(startDate || endDate
          ? {
              repliedAt: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
      },
      _count: {
        id: true,
      },
    });

    const classificationBreakdown: Record<string, number> = {};
    replyClassifications.forEach((item) => {
      const classification = item.replyClassification || 'unclassified';
      classificationBreakdown[classification] = item._count.id;
    });

    // Get top performing campaigns
    const topCampaigns = campaigns
      .map((c) => ({
        id: c.id,
        name: c.name,
        sent: c.sentCount || 0,
        openRate: c.sentCount
          ? (((c.openedCount || 0) / c.sentCount) * 100).toFixed(1)
          : '0.0',
        replyRate: c.sentCount
          ? (((c.repliedCount || 0) / c.sentCount) * 100).toFixed(1)
          : '0.0',
        score:
          (c.sentCount || 0) * 0.1 +
          (c.openedCount || 0) * 0.3 +
          (c.repliedCount || 0) * 1.0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Get campaign performance over time
    const campaignTimeSeries = await this.getCampaignTimeSeries(
      tenantId,
      startDate,
      endDate,
    );

    return {
      overview: {
        totalCampaigns,
        activeCampaigns,
        completedCampaigns,
        totalContacts,
        totalSent,
        totalOpened,
        totalClicked,
        totalReplied,
        totalBounced,
      },
      metrics: {
        openRate: parseFloat(openRate),
        clickRate: parseFloat(clickRate),
        replyRate: parseFloat(replyRate),
        bounceRate: parseFloat(bounceRate),
      },
      replyClassifications: classificationBreakdown,
      topCampaigns,
      timeSeries: campaignTimeSeries,
    };
  }

  /**
   * Get campaign metrics over time
   */
  private async getCampaignTimeSeries(
    tenantId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get all campaign emails sent in date range
    const campaignEmails = await this.prisma.campaignEmail.findMany({
      where: {
        campaign: {
          tenantId,
        },
        sentAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        sentAt: true,
        openedAt: true,
        clickedAt: true,
        repliedAt: true,
      },
    });

    // Group by date
    const dateMap = new Map<
      string,
      {
        date: string;
        sent: number;
        opened: number;
        clicked: number;
        replied: number;
      }
    >();

    const daysDiff = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    for (let i = 0; i <= daysDiff; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, {
        date: dateStr,
        sent: 0,
        opened: 0,
        clicked: 0,
        replied: 0,
      });
    }

    // Count events by date
    campaignEmails.forEach((email) => {
      if (email.sentAt) {
        const dateStr = email.sentAt.toISOString().split('T')[0];
        const data = dateMap.get(dateStr);
        if (data) {
          data.sent++;
          if (email.openedAt) data.opened++;
          if (email.clickedAt) data.clicked++;
          if (email.repliedAt) data.replied++;
        }
      }
    });

    return Array.from(dateMap.values());
  }

  /**
   * Get mailbox performance analytics
   */
  async getMailboxAnalytics(tenantId: string) {
    const mailboxes = await this.prisma.mailbox.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        status: true,
        dailySendLimit: true,
      },
    });

    const mailboxStats = await Promise.all(
      mailboxes.map(async (mailbox) => {
        const [sentCount, campaigns] = await Promise.all([
          this.prisma.campaignEmail.count({
            where: {
              mailboxId: mailbox.id,
              status: {
                in: ['sent', 'delivered', 'opened', 'clicked', 'replied'],
              },
            },
          }),
          this.prisma.campaign.count({
            where: {
              mailboxId: mailbox.id,
            },
          }),
        ]);

        const campaignEmails = await this.prisma.campaignEmail.findMany({
          where: {
            mailboxId: mailbox.id,
            status: {
              in: ['sent', 'delivered', 'opened', 'clicked', 'replied'],
            },
          },
          select: {
            status: true,
          },
        });

        const delivered = campaignEmails.filter((e) =>
          ['delivered', 'opened', 'clicked', 'replied'].includes(e.status),
        ).length;
        const deliveryRate =
          sentCount > 0 ? ((delivered / sentCount) * 100).toFixed(1) : '0.0';

        return {
          id: mailbox.id,
          email: mailbox.email,
          status: mailbox.status,
          dailySendLimit: mailbox.dailySendLimit,
          sentCount,
          deliveryRate: parseFloat(deliveryRate),
          campaigns,
        };
      }),
    );

    return {
      total: mailboxes.length,
      active: mailboxes.filter((m) => m.status === 'ACTIVE').length,
      warming: mailboxes.filter((m) => m.status === 'WARMING').length,
      mailboxes: mailboxStats,
    };
  }

  /**
   * Get proposal win rate analytics
   * Tracks proposal success rates and conversion metrics
   */
  async getProposalWinRate(
    tenantId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const dateFilter: any = { tenantId };
    if (startDate || endDate) {
      dateFilter.sentAt = {};
      if (startDate) dateFilter.sentAt.gte = new Date(startDate);
      if (endDate) dateFilter.sentAt.lte = new Date(endDate);
    }

    // Get all proposals that were sent (excludes draft/ready)
    const [sentProposals, signedProposals, wonProposals, rejectedProposals] =
      await Promise.all([
        this.prisma.proposal.count({
          where: {
            ...dateFilter,
            sentAt: { not: null },
          },
        }),
        this.prisma.proposal.count({
          where: {
            ...dateFilter,
            status: 'signed',
          },
        }),
        this.prisma.proposal.count({
          where: {
            ...dateFilter,
            wonBusiness: true,
          },
        }),
        this.prisma.proposal.count({
          where: {
            ...dateFilter,
            status: 'rejected',
          },
        }),
      ]);

    // Calculate rates
    const signRate = sentProposals > 0 ? (signedProposals / sentProposals) * 100 : 0;
    const winRate = sentProposals > 0 ? (wonProposals / sentProposals) * 100 : 0;
    const lossRate = sentProposals > 0 ? (rejectedProposals / sentProposals) * 100 : 0;

    // Get win rate over time for trend analysis
    const winRateTimeSeries = await this.getWinRateTimeSeries(
      tenantId,
      startDate,
      endDate,
    );

    return {
      overview: {
        totalSent: sentProposals,
        totalSigned: signedProposals,
        totalWon: wonProposals,
        totalRejected: rejectedProposals,
        pending: sentProposals - signedProposals - rejectedProposals,
      },
      rates: {
        signRate: parseFloat(signRate.toFixed(2)),
        winRate: parseFloat(winRate.toFixed(2)),
        lossRate: parseFloat(lossRate.toFixed(2)),
      },
      timeSeries: winRateTimeSeries,
    };
  }

  /**
   * Get win rate time series data for trend visualization
   */
  private async getWinRateTimeSeries(
    tenantId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Default 90 days
    const end = endDate ? new Date(endDate) : new Date();

    // Get all proposals grouped by month
    const proposals = await this.prisma.proposal.findMany({
      where: {
        tenantId,
        sentAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        sentAt: true,
        status: true,
        wonBusiness: true,
      },
    });

    // Group by month
    const monthMap = new Map<string, { sent: number; won: number; signed: number }>();

    proposals.forEach((p) => {
      if (p.sentAt) {
        const monthKey = `${p.sentAt.getFullYear()}-${String(p.sentAt.getMonth() + 1).padStart(2, '0')}`;

        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, { sent: 0, won: 0, signed: 0 });
        }

        const data = monthMap.get(monthKey)!;
        data.sent++;
        if (p.wonBusiness) data.won++;
        if (p.status === 'signed') data.signed++;
      }
    });

    // Convert to array and calculate rates
    return Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        sent: data.sent,
        won: data.won,
        signed: data.signed,
        winRate: data.sent > 0 ? ((data.won / data.sent) * 100).toFixed(1) : '0.0',
        signRate: data.sent > 0 ? ((data.signed / data.sent) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Get proposal pipeline breakdown by status
   * Shows proposals at each stage of the sales funnel
   */
  async getProposalPipeline(tenantId: string) {
    const [draft, ready, sent, signed, rejected] = await Promise.all([
      this.prisma.proposal.count({
        where: { tenantId, status: 'draft' },
      }),
      this.prisma.proposal.count({
        where: { tenantId, status: 'ready' },
      }),
      this.prisma.proposal.count({
        where: { tenantId, status: 'sent' },
      }),
      this.prisma.proposal.count({
        where: { tenantId, status: 'signed' },
      }),
      this.prisma.proposal.count({
        where: { tenantId, status: 'rejected' },
      }),
    ]);

    const total = draft + ready + sent + signed + rejected;

    return {
      stages: [
        {
          stage: 'draft',
          count: draft,
          percentage: total > 0 ? ((draft / total) * 100).toFixed(1) : '0.0',
        },
        {
          stage: 'ready',
          count: ready,
          percentage: total > 0 ? ((ready / total) * 100).toFixed(1) : '0.0',
        },
        {
          stage: 'sent',
          count: sent,
          percentage: total > 0 ? ((sent / total) * 100).toFixed(1) : '0.0',
        },
        {
          stage: 'signed',
          count: signed,
          percentage: total > 0 ? ((signed / total) * 100).toFixed(1) : '0.0',
        },
        {
          stage: 'rejected',
          count: rejected,
          percentage: total > 0 ? ((rejected / total) * 100).toFixed(1) : '0.0',
        },
      ],
      total,
    };
  }

  /**
   * Get time-to-close metrics
   * Calculates average time from proposal sent to signed
   */
  async getTimeToClose(tenantId: string) {
    // Get all signed proposals with sent and signed dates
    const signedProposals = await this.prisma.proposal.findMany({
      where: {
        tenantId,
        status: 'signed',
        sentAt: { not: null },
        clientSignedAt: { not: null },
      },
      select: {
        sentAt: true,
        clientSignedAt: true,
        created: true,
      },
    });

    if (signedProposals.length === 0) {
      return {
        averageDaysToClose: 0,
        medianDaysToClose: 0,
        fastestClose: 0,
        slowestClose: 0,
        totalClosed: 0,
      };
    }

    // Calculate days to close for each proposal
    const daysToClose = signedProposals
      .map((p) => {
        if (!p.sentAt || !p.clientSignedAt) return null;
        const diffMs = p.clientSignedAt.getTime() - p.sentAt.getTime();
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      })
      .filter((days): days is number => days !== null);

    if (daysToClose.length === 0) {
      return {
        averageDaysToClose: 0,
        medianDaysToClose: 0,
        fastestClose: 0,
        slowestClose: 0,
        totalClosed: 0,
      };
    }

    // Calculate statistics
    const average = daysToClose.reduce((sum, days) => sum + days, 0) / daysToClose.length;
    const sorted = [...daysToClose].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const fastest = Math.min(...daysToClose);
    const slowest = Math.max(...daysToClose);

    return {
      averageDaysToClose: parseFloat(average.toFixed(1)),
      medianDaysToClose: median,
      fastestClose: fastest,
      slowestClose: slowest,
      totalClosed: daysToClose.length,
    };
  }
}

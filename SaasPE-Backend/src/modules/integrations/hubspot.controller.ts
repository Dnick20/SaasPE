import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  UseGuards,
  Request,
  Get,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HubSpotService } from '../../shared/services/hubspot.service';
import { PrismaService } from '../../shared/database/prisma.service';

/**
 * HubSpot Integration Controller
 *
 * Handles:
 * - Webhooks from HubSpot
 * - Manual sync triggers
 * - Integration status
 */
@ApiTags('integrations')
@Controller('integrations/hubspot')
export class HubSpotController {
  constructor(
    private hubspotService: HubSpotService,
    private prisma: PrismaService,
  ) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check HubSpot integration status',
    description:
      'Returns whether HubSpot integration is enabled and configured',
  })
  getStatus(@Request() req) {
    return {
      enabled: this.hubspotService.isEnabled(),
      tenantId: req.user.tenantId,
    };
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Receive webhooks from HubSpot',
    description: 'Processes contact, company, and deal updates from HubSpot',
  })
  async handleWebhook(
    @Body() webhookData: any,
    @Headers('x-hubspot-signature') signature: string,
  ) {
    // TODO: Verify webhook signature for security
    // const isValid = this.verifyHubSpotSignature(webhookData, signature);
    // if (!isValid) throw new UnauthorizedException('Invalid webhook signature');

    await this.hubspotService.processWebhook(webhookData);

    return { received: true };
  }

  @Post('sync/client/:clientId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Manually sync a client to HubSpot',
    description:
      'Creates or updates a contact/company in HubSpot for the specified client',
  })
  async syncClient(@Request() req, @Body() body: { clientId: string }) {
    const client = await this.prisma.client.findUnique({
      where: { id: body.clientId, tenantId: req.user.tenantId },
    });

    if (!client) {
      return { error: 'Client not found' };
    }

    // Sync company
    let hubspotCompanyId = client.hubspotCompanyId;
    if (!hubspotCompanyId) {
      hubspotCompanyId = await this.hubspotService.syncCompany({
        name: client.companyName,
        domain: client.website || undefined,
        industry: client.industry || undefined,
        phone: client.contactPhone || undefined,
      });

      if (hubspotCompanyId) {
        await this.prisma.client.update({
          where: { id: client.id },
          data: { hubspotCompanyId },
        });
      }
    }

    // Sync contact if we have email
    let hubspotContactId = client.hubspotContactId;
    if (client.contactEmail && !hubspotContactId) {
      hubspotContactId = await this.hubspotService.syncContact({
        email: client.contactEmail,
        firstName: client.contactFirstName || undefined,
        lastName: client.contactLastName || undefined,
        company: client.companyName,
        phone: client.contactPhone || undefined,
        linkedIn: client.contactLinkedIn || undefined,
      });

      if (hubspotContactId) {
        await this.prisma.client.update({
          where: { id: client.id },
          data: { hubspotContactId },
        });
      }
    }

    return {
      success: true,
      hubspotCompanyId,
      hubspotContactId,
    };
  }

  @Post('sync/proposal/:proposalId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Manually sync a proposal to HubSpot',
    description:
      'Creates or updates a deal in HubSpot for the specified proposal',
  })
  async syncProposal(@Request() req, @Body() body: { proposalId: string }) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: body.proposalId, tenantId: req.user.tenantId },
      include: { client: true },
    });

    if (!proposal) {
      return { error: 'Proposal not found' };
    }

    // Get amount from pricing if available
    let amount: number | undefined;
    if (
      proposal.pricing &&
      typeof proposal.pricing === 'object' &&
      'total' in proposal.pricing
    ) {
      amount = Number(proposal.pricing.total) || undefined;
    }

    const hubspotDealId = await this.hubspotService.syncDeal({
      title: proposal.title,
      status: proposal.status,
      amount,
      closeDate: proposal.sentAt || undefined,
      hubspotDealId: proposal.hubspotDealId || undefined,
      contactIds: proposal.client.hubspotContactId
        ? [proposal.client.hubspotContactId]
        : undefined,
      companyIds: proposal.client.hubspotCompanyId
        ? [proposal.client.hubspotCompanyId]
        : undefined,
    });

    if (hubspotDealId && !proposal.hubspotDealId) {
      await this.prisma.proposal.update({
        where: { id: proposal.id },
        data: { hubspotDealId },
      });
    }

    return {
      success: true,
      hubspotDealId,
    };
  }

  @Post('sync/all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Sync all clients and proposals to HubSpot',
    description: 'Bulk sync operation for the entire tenant',
  })
  async syncAll(@Request() req) {
    const tenantId = req.user.tenantId;

    // Get all clients without HubSpot IDs
    const clients = await this.prisma.client.findMany({
      where: {
        tenantId,
        hubspotCompanyId: null,
      },
      take: 50, // Limit to prevent timeout
    });

    let syncedClients = 0;
    for (const client of clients) {
      const hubspotCompanyId = await this.hubspotService.syncCompany({
        name: client.companyName,
        domain: client.website || undefined,
        industry: client.industry || undefined,
      });

      if (hubspotCompanyId) {
        await this.prisma.client.update({
          where: { id: client.id },
          data: { hubspotCompanyId },
        });
        syncedClients++;
      }
    }

    // Get all proposals without HubSpot deal IDs
    const proposals = await this.prisma.proposal.findMany({
      where: {
        tenantId,
        hubspotDealId: null,
      },
      include: { client: true },
      take: 50,
    });

    let syncedProposals = 0;
    for (const proposal of proposals) {
      let amount: number | undefined;
      if (
        proposal.pricing &&
        typeof proposal.pricing === 'object' &&
        'total' in proposal.pricing
      ) {
        amount = Number(proposal.pricing.total) || undefined;
      }

      const hubspotDealId = await this.hubspotService.syncDeal({
        title: proposal.title,
        status: proposal.status,
        amount,
        contactIds: proposal.client.hubspotContactId
          ? [proposal.client.hubspotContactId]
          : undefined,
        companyIds: proposal.client.hubspotCompanyId
          ? [proposal.client.hubspotCompanyId]
          : undefined,
      });

      if (hubspotDealId) {
        await this.prisma.proposal.update({
          where: { id: proposal.id },
          data: { hubspotDealId },
        });
        syncedProposals++;
      }
    }

    return {
      success: true,
      syncedClients,
      syncedProposals,
    };
  }
}

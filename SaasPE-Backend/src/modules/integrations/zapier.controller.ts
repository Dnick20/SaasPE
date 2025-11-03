import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZapierService } from './zapier.service';

/**
 * Zapier Integration Controller
 *
 * Endpoints for Zapier webhook management and actions
 */
@ApiTags('integrations')
@ApiBearerAuth()
@Controller('integrations/zapier')
export class ZapierController {
  constructor(private zapierService: ZapierService) {}

  /**
   * WEBHOOK SUBSCRIPTION ENDPOINTS (Zapier calls these)
   */

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Subscribe to an event',
    description: 'Creates a webhook subscription for Zapier triggers',
  })
  async subscribe(
    @Request() req,
    @Body() body: { event: string; targetUrl: string },
  ) {
    return this.zapierService.subscribe(
      body.event,
      body.targetUrl,
      req.user.tenantId,
    );
  }

  @Delete('subscribe/:subscriptionId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Unsubscribe from an event',
    description: 'Removes a webhook subscription',
  })
  async unsubscribe(
    @Request() req,
    @Param('subscriptionId') subscriptionId: string,
  ) {
    await this.zapierService.unsubscribe(subscriptionId, req.user.tenantId);
    return { success: true };
  }

  @Get('subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List all subscriptions',
    description: 'Returns all active Zapier webhook subscriptions',
  })
  async getSubscriptions(@Request() req) {
    return this.zapierService.getSubscriptions(req.user.tenantId);
  }

  /**
   * TEST & SAMPLE DATA ENDPOINTS
   */

  @Post('test-webhook')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Test webhook URL',
    description: 'Sends a test payload to verify webhook is working',
  })
  async testWebhook(@Body() body: { targetUrl: string }) {
    const success = await this.zapierService.testWebhook(body.targetUrl);
    return {
      success,
      message: success ? 'Webhook test successful' : 'Webhook test failed',
    };
  }

  @Get('sample-data/:event')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get sample event data',
    description: 'Returns sample payload for an event type (used by Zapier UI)',
  })
  async getSampleData(@Param('event') event: string) {
    return this.zapierService.getSampleData(event);
  }

  /**
   * ZAPIER ACTION ENDPOINTS (Zapier calls these to perform actions)
   */

  @Post('actions/create-client')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create client (Zapier Action)',
    description: 'Creates a new client from Zapier',
  })
  async createClient(@Request() req, @Body() body: any) {
    // This would call the ClientsService to create a client
    // For now, return a placeholder
    return {
      success: true,
      message:
        'This action would create a client. Integrate with ClientsService.',
      data: body,
    };
  }

  @Post('actions/create-transcription')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create transcription (Zapier Action)',
    description: 'Creates a new transcription from Zapier (text-based)',
  })
  async createTranscription(@Request() req, @Body() body: any) {
    return {
      success: true,
      message:
        'This action would create a transcription. Integrate with TranscriptionsService.',
      data: body,
    };
  }

  @Post('actions/update-proposal')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Update proposal (Zapier Action)',
    description: 'Updates an existing proposal from Zapier',
  })
  async updateProposal(@Request() req, @Body() body: any) {
    return {
      success: true,
      message:
        'This action would update a proposal. Integrate with ProposalsService.',
      data: body,
    };
  }

  @Post('actions/start-campaign')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Start campaign (Zapier Action)',
    description: 'Starts an email campaign from Zapier',
  })
  async startCampaign(@Request() req, @Body() body: any) {
    return {
      success: true,
      message:
        'This action would start a campaign. Integrate with CampaignsService.',
      data: body,
    };
  }

  /**
   * ZAPIER APP CONFIGURATION ENDPOINTS
   */

  @Get('triggers')
  @ApiOperation({
    summary: 'List available triggers',
    description: 'Returns all available Zapier triggers',
  })
  async getTriggers() {
    return [
      {
        key: 'client.created',
        name: 'New Client',
        description: 'Triggers when a new client is created',
      },
      {
        key: 'transcription.completed',
        name: 'Transcription Completed',
        description: 'Triggers when a transcription is finished',
      },
      {
        key: 'transcription.analyzed',
        name: 'Transcription Analyzed',
        description: 'Triggers when AI analysis is completed',
      },
      {
        key: 'proposal.generated',
        name: 'Proposal Generated',
        description: 'Triggers when a new proposal is generated',
      },
      {
        key: 'proposal.sent',
        name: 'Proposal Sent',
        description: 'Triggers when a proposal is sent to client',
      },
      {
        key: 'proposal.signed',
        name: 'Proposal Signed',
        description: 'Triggers when a proposal is signed',
      },
      {
        key: 'campaign.started',
        name: 'Campaign Started',
        description: 'Triggers when a campaign is started',
      },
      {
        key: 'campaign.email.replied',
        name: 'Campaign Email Replied',
        description: 'Triggers when someone replies to a campaign email',
      },
    ];
  }

  @Get('actions')
  @ApiOperation({
    summary: 'List available actions',
    description: 'Returns all available Zapier actions',
  })
  async getActions() {
    return [
      {
        key: 'create-client',
        name: 'Create Client',
        description: 'Creates a new client in SaasPE',
      },
      {
        key: 'create-transcription',
        name: 'Create Transcription',
        description: 'Creates a text-based transcription',
      },
      {
        key: 'update-proposal',
        name: 'Update Proposal',
        description: 'Updates an existing proposal',
      },
      {
        key: 'start-campaign',
        name: 'Start Campaign',
        description: 'Starts an email campaign',
      },
    ];
  }

  @Post('auth/test')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Test authentication',
    description: 'Validates API key (called by Zapier during setup)',
  })
  async testAuth(@Request() req) {
    return {
      success: true,
      user: {
        id: req.user.sub,
        email: req.user.email,
        tenantId: req.user.tenantId,
      },
    };
  }
}

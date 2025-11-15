import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ABTestingService } from './ab-testing.service';

/**
 * A/B Testing Controller
 *
 * Endpoints for managing campaign A/B tests
 */
@ApiTags('campaigns')
@ApiBearerAuth()
@Controller('campaigns/ab-testing')
@UseGuards(JwtAuthGuard)
export class ABTestingController {
  constructor(private abTestingService: ABTestingService) {}

  @Post('create')
  @ApiOperation({
    summary: 'Create A/B test for a campaign',
    description: 'Creates multi-variant test to optimize email performance',
  })
  async createABTest(
    @Request() req,
    @Body()
    body: {
      campaignId: string;
      variants: Array<{
        name: string;
        subject: string;
        body: string;
        percentage: number;
      }>;
      metric?: 'opens' | 'clicks' | 'replies';
    },
  ) {
    return this.abTestingService.createABTest(
      body.campaignId,
      req.user.tenantId,
      body.variants,
      body.metric || 'opens',
    );
  }

  @Get(':campaignId')
  @ApiOperation({
    summary: 'Get A/B test for a campaign',
    description: 'Returns A/B test configuration and current status',
  })
  async getABTest(@Param('campaignId') campaignId: string) {
    return this.abTestingService.getABTest(campaignId);
  }

  @Get(':campaignId/results')
  @ApiOperation({
    summary: 'Get A/B test results',
    description:
      'Returns detailed results with statistical analysis and recommendations',
  })
  async getResults(@Param('campaignId') campaignId: string) {
    return this.abTestingService.getResults(campaignId);
  }

  @Post(':campaignId/declare-winner')
  @ApiOperation({
    summary: 'Manually declare a winner',
    description:
      'Override automatic winner detection and select winning variant',
  })
  async declareWinner(
    @Request() req,
    @Param('campaignId') campaignId: string,
    @Body() body: { variantId: string },
  ) {
    return this.abTestingService.declareWinner(
      campaignId,
      body.variantId,
      req.user.tenantId,
    );
  }

  @Delete(':campaignId')
  @ApiOperation({
    summary: 'Cancel A/B test',
    description: 'Cancels running A/B test and reverts to standard campaign',
  })
  async cancelABTest(@Request() req, @Param('campaignId') campaignId: string) {
    await this.abTestingService.cancelABTest(campaignId, req.user.tenantId);
    return { success: true };
  }
}

import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  async getDashboard(@Req() req) {
    return this.analyticsService.getDashboardMetrics(req.user.tenantId);
  }

  @Get('activity')
  async getActivity(@Req() req, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.analyticsService.getActivity(req.user.tenantId, limitNum);
  }

  @Get('metrics')
  async getMetrics(
    @Req() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getMetrics(
      req.user.tenantId,
      startDate,
      endDate,
    );
  }

  @Get('ai-costs')
  async getAiCosts(
    @Req() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getAiCosts(
      req.user.tenantId,
      startDate,
      endDate,
    );
  }

  @Get('campaigns')
  async getCampaignAnalytics(
    @Req() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getCampaignAnalytics(
      req.user.tenantId,
      startDate,
      endDate,
    );
  }

  @Get('mailboxes')
  async getMailboxAnalytics(@Req() req) {
    return this.analyticsService.getMailboxAnalytics(req.user.tenantId);
  }
}

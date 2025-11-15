import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WarmupService } from './warmup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('warmup')
@UseGuards(JwtAuthGuard)
export class WarmupController {
  constructor(private readonly warmupService: WarmupService) {}

  /**
   * GET /api/v1/warmup/stats
   * Get aggregate warmup statistics for the tenant
   */
  @Get('stats')
  getStats(@Request() req) {
    return this.warmupService.getTenantWarmupStats(req.user.tenantId);
  }

  /**
   * POST /api/v1/warmup/:mailboxId/start
   * Start warmup for a mailbox
   */
  @Post(':mailboxId/start')
  startWarmup(
    @Param('mailboxId') mailboxId: string,
    @Body('targetLimit') targetLimit?: number,
  ) {
    return this.warmupService.startWarmup(mailboxId, targetLimit || 50);
  }

  /**
   * POST /api/v1/warmup/:mailboxId/pause
   * Pause warmup for a mailbox
   */
  @Post(':mailboxId/pause')
  pauseWarmup(@Param('mailboxId') mailboxId: string) {
    return this.warmupService.pauseWarmup(mailboxId);
  }

  /**
   * POST /api/v1/warmup/:mailboxId/resume
   * Resume warmup for a mailbox
   */
  @Post(':mailboxId/resume')
  resumeWarmup(@Param('mailboxId') mailboxId: string) {
    return this.warmupService.resumeWarmup(mailboxId);
  }

  /**
   * POST /api/v1/warmup/:mailboxId/stop
   * Stop warmup and mark mailbox as active
   */
  @Post(':mailboxId/stop')
  stopWarmup(@Param('mailboxId') mailboxId: string) {
    return this.warmupService.stopWarmup(mailboxId);
  }

  /**
   * GET /api/v1/warmup/:mailboxId/status
   * Get warmup status for a mailbox
   */
  @Get(':mailboxId/status')
  getStatus(@Param('mailboxId') mailboxId: string) {
    return this.warmupService.getWarmupStatus(mailboxId);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JourneyService } from './journey.service';
import {
  UpdateJourneyDto,
  UpdateStepDto,
  SkipStepDto,
  JourneyResponseDto,
} from './dto';

@ApiTags('Journey')
@ApiBearerAuth()
@Controller('journey')
@UseGuards(JwtAuthGuard)
export class JourneyController {
  constructor(private readonly journeyService: JourneyService) {}

  /**
   * GET /api/v1/journey/status
   * Get current journey state for authenticated user
   */
  @Get('status')
  @ApiOperation({ summary: 'Get current journey status with progress' })
  @ApiResponse({
    status: 200,
    description: 'Journey status retrieved',
    type: JourneyResponseDto,
  })
  async getJourneyStatus(@Request() req): Promise<JourneyResponseDto> {
    const userId = req.user.id;
    return this.journeyService.getJourneyStatus(userId);
  }

  /**
   * GET /api/v1/journey
   * Get current journey state (alias for /status)
   */
  @Get()
  @ApiOperation({ summary: 'Get current journey state' })
  @ApiResponse({
    status: 200,
    description: 'Journey state retrieved',
    type: JourneyResponseDto,
  })
  async getJourney(@Request() req): Promise<JourneyResponseDto> {
    const userId = req.user.id;
    return this.journeyService.getOrCreateJourney(userId);
  }

  /**
   * POST /api/v1/journey
   * Update journey state (called by frontend on step changes)
   */
  @Post()
  @ApiOperation({ summary: 'Update journey state' })
  @ApiResponse({
    status: 200,
    description: 'Journey updated',
    type: JourneyResponseDto,
  })
  async updateJourney(
    @Request() req,
    @Body() dto: UpdateJourneyDto,
  ): Promise<JourneyResponseDto> {
    const userId = req.user.id;
    return this.journeyService.updateJourney(userId, dto);
  }

  /**
   * PATCH /api/v1/journey/complete-step
   * Mark a specific step as complete
   */
  @Patch('complete-step')
  @ApiOperation({ summary: 'Mark a step as complete' })
  @ApiResponse({
    status: 200,
    description: 'Step marked complete',
    type: JourneyResponseDto,
  })
  async completeStep(
    @Request() req,
    @Body() dto: UpdateStepDto,
  ): Promise<JourneyResponseDto> {
    const userId = req.user.id;
    return this.journeyService.completeStep(userId, dto.step, dto.metadata);
  }

  /**
   * PATCH /api/v1/journey/update-step
   * Update current step
   */
  @Patch('update-step')
  @ApiOperation({ summary: 'Update current step' })
  @ApiResponse({
    status: 200,
    description: 'Step updated',
    type: JourneyResponseDto,
  })
  async updateStep(
    @Request() req,
    @Body() dto: UpdateStepDto,
  ): Promise<JourneyResponseDto> {
    const userId = req.user.id;
    return this.journeyService.updateCurrentStep(userId, dto.step);
  }

  /**
   * POST /api/v1/journey/skip
   * Skip onboarding entirely
   */
  @Post('skip')
  @ApiOperation({ summary: 'Skip entire onboarding journey' })
  @ApiResponse({
    status: 200,
    description: 'Onboarding skipped',
    type: JourneyResponseDto,
  })
  async skipOnboarding(@Request() req): Promise<JourneyResponseDto> {
    const userId = req.user.id;
    return this.journeyService.skipOnboarding(userId);
  }

  /**
   * POST /api/v1/journey/skip-step
   * Skip a specific step
   */
  @Post('skip-step')
  @ApiOperation({ summary: 'Skip a specific step' })
  @ApiResponse({
    status: 200,
    description: 'Step skipped',
    type: JourneyResponseDto,
  })
  async skipStep(
    @Request() req,
    @Body() dto: SkipStepDto,
  ): Promise<JourneyResponseDto> {
    const userId = req.user.id;
    return this.journeyService.skipStep(userId, dto.step);
  }

  /**
   * POST /api/v1/journey/reset
   * Reset journey to beginning
   */
  @Post('reset')
  @ApiOperation({ summary: 'Reset journey to beginning' })
  @ApiResponse({
    status: 200,
    description: 'Journey reset',
    type: JourneyResponseDto,
  })
  async resetJourney(@Request() req): Promise<JourneyResponseDto> {
    const userId = req.user.id;
    return this.journeyService.resetJourney(userId);
  }

  /**
   * GET /api/v1/journey/metadata
   * Get journey metadata
   */
  @Get('metadata')
  @ApiOperation({ summary: 'Get journey metadata' })
  @ApiResponse({ status: 200, description: 'Metadata retrieved' })
  async getMetadata(@Request() req) {
    const userId = req.user.id;
    return this.journeyService.getJourneyMetadata(userId);
  }

  /**
   * POST /api/v1/journey/metadata
   * Update journey metadata
   */
  @Post('metadata')
  @ApiOperation({ summary: 'Update journey metadata' })
  @ApiResponse({ status: 200, description: 'Metadata updated' })
  async updateMetadata(@Request() req, @Body() metadata: Record<string, any>) {
    const userId = req.user.id;
    return this.journeyService.updateMetadata(userId, metadata);
  }
}

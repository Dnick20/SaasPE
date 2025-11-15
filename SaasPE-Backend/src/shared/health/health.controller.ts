import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { HealthCheckResponse } from './interfaces/health-check.interface';
import { getConfigStatus } from '../config/env-validation';
import { FEATURE_FLAGS, getFeatureFlagStatus } from '../config/feature-flags';
import { Public } from '../../modules/auth/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Basic health check endpoint
   * Returns 200 if application is running
   */
  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
  })
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Detailed health check with all system statuses
   * Includes database, cache, providers, and token health
   */
  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with all system statuses' })
  @ApiResponse({
    status: 200,
    description: 'Detailed health information',
  })
  async getDetailedHealth(): Promise<HealthCheckResponse> {
    return this.healthService.getDetailedHealth();
  }

  /**
   * Readiness probe for Kubernetes/container orchestration
   * Returns 200 when application is ready to accept traffic
   */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe for container orchestration' })
  @ApiResponse({
    status: 200,
    description: 'Application is ready to accept traffic',
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not ready',
  })
  async getReadiness(): Promise<{ status: string; ready: boolean }> {
    const isReady = await this.healthService.isReady();
    return {
      status: isReady ? 'ready' : 'not ready',
      ready: isReady,
    };
  }

  /**
   * Liveness probe for Kubernetes/container orchestration
   * Returns 200 if application should not be restarted
   */
  @Get('live')
  @ApiOperation({ summary: 'Liveness probe for container orchestration' })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
  })
  getLiveness(): { status: string; alive: boolean } {
    return {
      status: 'alive',
      alive: true,
    };
  }

  /**
   * Configuration status endpoint
   * Returns masked status of all environment variables
   * Status values: 'configured', 'not_configured', 'placeholder'
   */
  @Get('config')
  @ApiOperation({ summary: 'Check configuration status of all services' })
  @ApiResponse({
    status: 200,
    description: 'Configuration status retrieved',
  })
  getConfigStatus(): Record<string, string> {
    return getConfigStatus();
  }

  /**
   * Feature flags status endpoint
   * Returns current status of all feature flags
   * Useful for frontend to determine which features to show/hide
   */
  @Get('features')
  @ApiOperation({ summary: 'Get status of all feature flags' })
  @ApiResponse({
    status: 200,
    description: 'Feature flags status retrieved',
    schema: {
      type: 'object',
      properties: {
        ENABLE_OAUTH: { type: 'boolean' },
        ENABLE_AI_PRICING: { type: 'boolean' },
        ENABLE_NOTION_SYNC: { type: 'boolean' },
        ENABLE_HUBSPOT: { type: 'boolean' },
        ENABLE_ADVANCED_ANALYTICS: { type: 'boolean' },
        ENABLE_BETA_FEATURES: { type: 'boolean' },
      },
    },
  })
  getFeatureFlags() {
    return getFeatureFlagStatus();
  }
}

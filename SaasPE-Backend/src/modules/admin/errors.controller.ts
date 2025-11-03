import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ErrorsService } from './errors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateErrorLogDto, GetErrorLogsDto, ResolveErrorDto } from './dto';

@Controller('admin/errors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ErrorsController {
  constructor(private readonly errorsService: ErrorsService) {}

  /**
   * POST /api/v1/admin/errors
   * Log an error (can be called by frontend or backend)
   */
  @Post()
  async logError(@Request() req, @Body() dto: CreateErrorLogDto) {
    return this.errorsService.logError(req.user.tenantId, dto);
  }

  /**
   * GET /api/v1/admin/errors
   * Get paginated list of errors with filters (admin only)
   */
  @Get()
  @Roles('admin')
  async getErrors(@Request() req, @Query() filters: GetErrorLogsDto) {
    return this.errorsService.getErrors(req.user.tenantId, filters);
  }

  /**
   * GET /api/v1/admin/errors/stats
   * Get error statistics (admin only)
   */
  @Get('stats')
  @Roles('admin')
  async getStats(@Request() req, @Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : 7;
    return this.errorsService.getErrorStats(req.user.tenantId, daysNum);
  }

  /**
   * GET /api/v1/admin/errors/unread-count
   * Get count of unread errors for notifications
   */
  @Get('unread-count')
  @Roles('admin')
  async getUnreadCount(@Request() req) {
    return this.errorsService.getUnreadErrorCount(req.user.tenantId);
  }

  /**
   * GET /api/v1/admin/errors/:id
   * Get a specific error log (admin only)
   */
  @Get(':id')
  @Roles('admin')
  async getError(@Request() req, @Param('id') id: string) {
    return this.errorsService.getError(req.user.tenantId, id);
  }

  /**
   * PATCH /api/v1/admin/errors/:id/resolve
   * Mark an error as resolved (admin only)
   */
  @Patch(':id/resolve')
  @Roles('admin')
  async resolveError(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ResolveErrorDto,
  ) {
    return this.errorsService.resolveError(
      req.user.tenantId,
      id,
      req.user.id,
      dto.resolution,
    );
  }

  /**
   * PATCH /api/v1/admin/errors/:id/unresolve
   * Mark an error as unresolved (admin only)
   */
  @Patch(':id/unresolve')
  @Roles('admin')
  async unresolveError(@Request() req, @Param('id') id: string) {
    return this.errorsService.unresolveError(req.user.tenantId, id);
  }
}

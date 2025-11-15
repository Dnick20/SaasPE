import { Body, Controller, Delete, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuppressionsService } from './suppressions.service';

@Controller('suppressions')
@UseGuards(JwtAuthGuard)
export class SuppressionsController {
  constructor(private readonly suppressionsService: SuppressionsService) {}

  @Get()
  async list(
    @Request() req,
    @Query('type') type?: string,
    @Query('q') q?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    const { tenantId } = req.user;
    return this.suppressionsService.list(tenantId, { type, q, page, limit });
  }

  @Post()
  async add(@Request() req, @Body() body: { email: string; type: string; reason?: string }) {
    const { tenantId } = req.user;
    return this.suppressionsService.add(tenantId, body.email, body.type, body.reason);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const { tenantId } = req.user;
    return this.suppressionsService.remove(tenantId, id);
  }

  @Post('import')
  async import(@Request() req, @Body() body: { entries: Array<{ email: string; type: string; reason?: string }> }) {
    const { tenantId } = req.user;
    return this.suppressionsService.bulkImport(tenantId, body.entries || []);
  }

  @Get('export')
  async export(@Request() req, @Query('type') type?: string) {
    const { tenantId } = req.user;
    const csv = await this.suppressionsService.exportCsv(tenantId, type);
    return { csv };
  }
}



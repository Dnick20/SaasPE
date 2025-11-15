import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
  SetMetadata,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TierLimitGuard } from '../../shared/guards/tier-limit.guard';
import { MailboxesService } from './mailboxes.service';
import { CreateMailboxDto } from './dto/create-mailbox.dto';
import { UpdateMailboxDto } from './dto/update-mailbox.dto';
import {
  MailboxResponseDto,
  MailboxListResponseDto,
} from './dto/mailbox-response.dto';
import {
  BulkImportMailboxesDto,
  BulkImportResponseDto,
} from './dto/bulk-import.dto';

@Controller('mailboxes')
@UseGuards(JwtAuthGuard)
export class MailboxesController {
  constructor(private readonly mailboxesService: MailboxesService) {}

  /**
   * POST /api/v1/mailboxes
   * Create a new mailbox
   */
  @Post()
  @UseGuards(TierLimitGuard)
  @SetMetadata('limitType', 'mailboxes')
  async create(
    @Request() req,
    @Body() createMailboxDto: CreateMailboxDto,
  ): Promise<MailboxResponseDto> {
    const { tenantId, userId } = req.user;
    return this.mailboxesService.create(tenantId, userId, createMailboxDto);
  }

  /**
   * GET /api/v1/mailboxes
   * List all mailboxes for the tenant
   */
  @Get()
  async findAll(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ): Promise<MailboxListResponseDto> {
    const { tenantId } = req.user;
    return this.mailboxesService.findAll(tenantId, page, limit, status);
  }

  /**
   * GET /api/v1/mailboxes/:id
   * Get a single mailbox
   */
  @Get(':id')
  async findOne(
    @Request() req,
    @Param('id') id: string,
  ): Promise<MailboxResponseDto> {
    const { tenantId } = req.user;
    return this.mailboxesService.findOne(tenantId, id);
  }

  /**
   * PATCH /api/v1/mailboxes/:id
   * Update a mailbox
   */
  @Patch(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateMailboxDto: UpdateMailboxDto,
  ): Promise<MailboxResponseDto> {
    const { tenantId } = req.user;
    return this.mailboxesService.update(tenantId, id, updateMailboxDto);
  }

  /**
   * DELETE /api/v1/mailboxes/:id
   * Delete a mailbox
   */
  @Delete(':id')
  async delete(
    @Request() req,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    const { tenantId } = req.user;
    await this.mailboxesService.delete(tenantId, id);
    return { message: 'Mailbox deleted successfully' };
  }

  /**
   * POST /api/v1/mailboxes/:id/test
   * Test mailbox connection
   */
  @Post(':id/test')
  async testConnection(
    @Request() req,
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    const { tenantId } = req.user;
    return this.mailboxesService.testConnection(tenantId, id);
  }

  /**
   * POST /api/v1/mailboxes/bulk-import
   * Import multiple mailboxes from CSV data
   */
  @Post('bulk-import')
  @UseGuards(TierLimitGuard)
  @SetMetadata('limitType', 'mailboxes')
  async bulkImport(
    @Request() req,
    @Body() bulkImportDto: BulkImportMailboxesDto,
  ): Promise<BulkImportResponseDto> {
    const { tenantId, userId } = req.user;
    return this.mailboxesService.bulkImport(tenantId, userId, bulkImportDto);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateContactDto,
  UpdateContactDto,
  BulkImportContactsDto,
} from './dto';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  /**
   * POST /api/v1/contacts
   * Create a new contact
   */
  @Post()
  create(@Request() req, @Body() dto: CreateContactDto) {
    return this.contactsService.create(req.user.tenantId, dto);
  }

  /**
   * POST /api/v1/contacts/bulk-import
   * Bulk import contacts from CSV or array
   */
  @Post('bulk-import')
  bulkImport(@Request() req, @Body() dto: BulkImportContactsDto) {
    return this.contactsService.bulkImport(req.user.tenantId, dto);
  }

  /**
   * GET /api/v1/contacts
   * Get all contacts with pagination and filtering
   */
  @Get()
  findAll(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('tags') tags?: string,
    @Query('search') search?: string,
  ) {
    const options = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      tags: tags ? tags.split(',') : undefined,
      search,
    };

    return this.contactsService.findAll(req.user.tenantId, options);
  }

  /**
   * GET /api/v1/contacts/stats
   * Get contact statistics
   */
  @Get('stats')
  getStats(@Request() req) {
    return this.contactsService.getStats(req.user.tenantId);
  }

  /**
   * GET /api/v1/contacts/:id
   * Get a single contact by ID
   */
  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.contactsService.findOne(req.user.tenantId, id);
  }

  /**
   * PATCH /api/v1/contacts/:id
   * Update a contact
   */
  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.update(req.user.tenantId, id, dto);
  }

  /**
   * DELETE /api/v1/contacts/:id
   * Delete a contact
   */
  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.contactsService.remove(req.user.tenantId, id);
  }
}

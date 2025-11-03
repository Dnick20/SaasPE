import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PlaybooksService } from './playbooks.service';
import {
  CreatePlaybookDto,
  UpdatePlaybookDto,
  PlaybookResponseDto,
  GenerateScriptsDto,
} from './dto';

/**
 * Playbooks Controller
 *
 * Endpoints:
 * - POST /playbooks - Create a new playbook
 * - GET /playbooks - List all playbooks for tenant
 * - GET /playbooks/client/:clientId - Get playbooks for specific client
 * - GET /playbooks/:id - Get single playbook
 * - PATCH /playbooks/:id - Update playbook
 * - DELETE /playbooks/:id - Delete playbook
 */
@Controller('playbooks')
@ApiTags('Playbooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PlaybooksController {
  constructor(private playbooksService: PlaybooksService) {}

  /**
   * Create a new playbook
   */
  @Post()
  @ApiOperation({ summary: 'Create a new playbook' })
  @ApiResponse({
    status: 201,
    description: 'Playbook created successfully',
    type: PlaybookResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Client or proposal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreatePlaybookDto,
  ): Promise<PlaybookResponseDto> {
    return this.playbooksService.create(user.tenantId, dto, user.id);
  }

  /**
   * Get all playbooks for tenant
   */
  @Get()
  @ApiOperation({ summary: 'Get all playbooks for tenant' })
  @ApiResponse({
    status: 200,
    description: 'Playbooks retrieved successfully',
    type: [PlaybookResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@CurrentUser() user: any): Promise<PlaybookResponseDto[]> {
    return this.playbooksService.findAll(user.tenantId);
  }

  /**
   * Get playbooks for a specific client
   */
  @Get('client/:clientId')
  @ApiOperation({ summary: 'Get playbooks for a specific client' })
  @ApiResponse({
    status: 200,
    description: 'Playbooks retrieved successfully',
    type: [PlaybookResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findByClient(
    @CurrentUser() user: any,
    @Param('clientId') clientId: string,
  ): Promise<PlaybookResponseDto[]> {
    return this.playbooksService.findByClient(user.tenantId, clientId);
  }

  /**
   * Get a single playbook by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get playbook by ID' })
  @ApiResponse({
    status: 200,
    description: 'Playbook retrieved successfully',
    type: PlaybookResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Playbook not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<PlaybookResponseDto> {
    return this.playbooksService.findOne(user.tenantId, id);
  }

  /**
   * Update a playbook
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a playbook' })
  @ApiResponse({
    status: 200,
    description: 'Playbook updated successfully',
    type: PlaybookResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Playbook not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdatePlaybookDto,
  ): Promise<PlaybookResponseDto> {
    return this.playbooksService.update(user.tenantId, id, dto);
  }

  /**
   * Generate scripts using AI
   */
  @Post('generate-scripts')
  @ApiOperation({ summary: 'Generate playbook scripts using AI' })
  @ApiResponse({
    status: 200,
    description: 'Scripts generated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or generation failed',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateScripts(@Body() dto: GenerateScriptsDto): Promise<{
    emailScript: {
      subject: string;
      body: string;
      ctaText: string;
      ctaUrl?: string;
      followUpSequence?: string[];
    };
    linkedInScript: {
      connectionRequest: string;
      firstMessage: string;
      followUpMessage: string;
    };
    coldCallScript: {
      opener: string;
      discovery: string[];
      objectionHandling: Record<string, string>;
      close: string;
    };
  }> {
    return this.playbooksService.generateScripts(dto);
  }

  /**
   * Delete a playbook
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a playbook' })
  @ApiResponse({ status: 204, description: 'Playbook deleted successfully' })
  @ApiResponse({ status: 404, description: 'Playbook not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async delete(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<void> {
    return this.playbooksService.delete(user.tenantId, id);
  }
}

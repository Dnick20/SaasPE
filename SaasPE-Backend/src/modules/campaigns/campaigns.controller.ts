import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CampaignsService } from './campaigns.service';
import { TemplateVariablesService } from './template-variables.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import {
  CampaignResponseDto,
  StartCampaignResponseDto,
  PauseCampaignResponseDto,
  PaginatedCampaignsResponseDto,
  PaginatedCampaignEmailsResponseDto,
} from './dto/campaign-response.dto';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly templateVariablesService: TemplateVariablesService,
  ) {}

  /**
   * POST /campaigns
   * Create a new campaign
   */
  @Post()
  async create(
    @Request() req,
    @Body() createCampaignDto: CreateCampaignDto,
  ): Promise<CampaignResponseDto> {
    const { tenantId, sub: userId } = req.user;
    return this.campaignsService.create(tenantId, userId, createCampaignDto);
  }

  /**
   * POST /campaigns/:id/start
   * Start a campaign
   */
  @Post(':id/start')
  async start(
    @Request() req,
    @Param('id') id: string,
  ): Promise<StartCampaignResponseDto> {
    const { tenantId } = req.user;
    return this.campaignsService.start(tenantId, id);
  }

  /**
   * POST /campaigns/:id/pause
   * Pause a running campaign
   */
  @Post(':id/pause')
  async pause(
    @Request() req,
    @Param('id') id: string,
  ): Promise<PauseCampaignResponseDto> {
    const { tenantId } = req.user;
    return this.campaignsService.pause(tenantId, id);
  }

  /**
   * GET /campaigns
   * List all campaigns
   */
  @Get()
  async findAll(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('mailboxId') mailboxId?: string,
  ): Promise<PaginatedCampaignsResponseDto> {
    const { tenantId } = req.user;
    return this.campaignsService.findAll(
      tenantId,
      page,
      limit,
      status,
      mailboxId,
    );
  }

  /**
   * GET /campaigns/:id
   * Get a single campaign
   */
  @Get(':id')
  async findOne(
    @Request() req,
    @Param('id') id: string,
  ): Promise<CampaignResponseDto> {
    const { tenantId } = req.user;
    return this.campaignsService.findOne(tenantId, id);
  }

  /**
   * GET /campaigns/:id/emails
   * List all emails in a campaign
   */
  @Get(':id/emails')
  async findCampaignEmails(
    @Request() req,
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('sequenceStep', new ParseIntPipe({ optional: true }))
    sequenceStep?: number,
  ): Promise<PaginatedCampaignEmailsResponseDto> {
    const { tenantId } = req.user;
    return this.campaignsService.findCampaignEmails(
      tenantId,
      id,
      page,
      limit,
      status,
      sequenceStep,
    );
  }

  /**
   * POST /campaigns/template/preview
   * Preview email template with sample or provided contact data
   */
  @Post('template/preview')
  async previewTemplate(
    @Body()
    body: {
      subject: string;
      body: string;
      sampleContact?: any;
    },
  ) {
    return this.templateVariablesService.previewTemplate(
      body.subject,
      body.body,
      body.sampleContact,
    );
  }

  /**
   * POST /campaigns/template/validate
   * Validate email template variables
   */
  @Post('template/validate')
  async validateTemplate(
    @Body()
    body: {
      subject: string;
      body: string;
      customFieldNames?: string[];
    },
  ) {
    const subjectValidation = this.templateVariablesService.validateTemplate(
      body.subject,
      body.customFieldNames,
    );
    const bodyValidation = this.templateVariablesService.validateTemplate(
      body.body,
      body.customFieldNames,
    );

    const allUnsupported = [
      ...new Set([
        ...subjectValidation.unsupportedVariables,
        ...bodyValidation.unsupportedVariables,
      ]),
    ];

    return {
      valid: subjectValidation.valid && bodyValidation.valid,
      unsupportedVariables: allUnsupported,
      subjectVariables: this.templateVariablesService.getTemplateVariables(
        body.subject,
      ),
      bodyVariables: this.templateVariablesService.getTemplateVariables(
        body.body,
      ),
      supportedVariables: this.templateVariablesService.getSupportedVariables(),
    };
  }

  /**
   * GET /campaigns/template/variables
   * Get list of supported template variables
   */
  @Get('template/variables')
  async getSupportedVariables() {
    return {
      standard: this.templateVariablesService.getSupportedVariables(),
      examples: [
        {
          variable: 'firstName',
          description: "Contact's first name",
          example: 'John',
        },
        {
          variable: 'lastName',
          description: "Contact's last name",
          example: 'Doe',
        },
        {
          variable: 'fullName',
          description: "Contact's full name (firstName + lastName)",
          example: 'John Doe',
        },
        {
          variable: 'company',
          description: "Contact's company name",
          example: 'Acme Corp',
        },
        {
          variable: 'email',
          description: "Contact's email address",
          example: 'john@acme.com',
        },
        {
          variable: 'linkedinUrl',
          description: "Contact's LinkedIn profile URL",
          example: 'https://linkedin.com/in/johndoe',
        },
      ],
      usage: {
        description: 'Use double curly braces to insert variables',
        examples: [
          'Hi {{firstName}},',
          'I noticed you work at {{company}}',
          'Your email {{email}} was added to our list',
        ],
      },
    };
  }
}

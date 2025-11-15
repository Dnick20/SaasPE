import {
  Controller,
  Get,
  Post,
  Put,
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
import { CompanyProfileService } from './company-profile.service';
import {
  CreateCompanyProfileDto,
  UpdateCompanyProfileDto,
  AnalyzeWebsiteDto,
  CompanyProfileResponseDto,
} from './dto';

@ApiTags('Company Profile')
@ApiBearerAuth()
@Controller('company-profile')
@UseGuards(JwtAuthGuard)
export class CompanyProfileController {
  constructor(private readonly companyProfileService: CompanyProfileService) {}

  /**
   * POST /api/v1/company-profile
   * Create company profile (from discovery wizard)
   */
  @Post()
  @ApiOperation({ summary: 'Create company profile' })
  @ApiResponse({
    status: 201,
    description: 'Company profile created',
    type: CompanyProfileResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Profile already exists' })
  async create(
    @Request() req,
    @Body() dto: CreateCompanyProfileDto,
  ): Promise<CompanyProfileResponseDto> {
    const userId = req.user.id;
    return this.companyProfileService.create(userId, dto);
  }

  /**
   * GET /api/v1/company-profile
   * Get current user's company profile
   */
  @Get()
  @ApiOperation({ summary: 'Get current user company profile' })
  @ApiResponse({
    status: 200,
    description: 'Company profile retrieved',
    type: CompanyProfileResponseDto,
  })
  async getProfile(@Request() req): Promise<CompanyProfileResponseDto | null> {
    const userId = req.user.id;
    return this.companyProfileService.getByUserId(userId);
  }

  /**
   * PUT /api/v1/company-profile
   * Update company profile (full update)
   */
  @Put()
  @ApiOperation({ summary: 'Update company profile (full update)' })
  @ApiResponse({
    status: 200,
    description: 'Company profile updated',
    type: CompanyProfileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async update(
    @Request() req,
    @Body() dto: UpdateCompanyProfileDto,
  ): Promise<CompanyProfileResponseDto> {
    const userId = req.user.id;
    return this.companyProfileService.update(userId, dto);
  }

  /**
   * PATCH /api/v1/company-profile
   * Partial update of company profile
   */
  @Patch()
  @ApiOperation({ summary: 'Partial update of company profile' })
  @ApiResponse({
    status: 200,
    description: 'Company profile updated',
    type: CompanyProfileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async partialUpdate(
    @Request() req,
    @Body() dto: UpdateCompanyProfileDto,
  ): Promise<CompanyProfileResponseDto> {
    const userId = req.user.id;
    return this.companyProfileService.update(userId, dto);
  }

  /**
   * GET /api/v1/company-profile/defaults
   * Get default settings for campaigns/proposals
   */
  @Get('defaults')
  @ApiOperation({ summary: 'Get default settings' })
  @ApiResponse({ status: 200, description: 'Default settings retrieved' })
  async getDefaults(@Request() req) {
    const userId = req.user.id;
    return this.companyProfileService.getDefaultSettings(userId);
  }

  /**
   * POST /api/v1/company-profile/analyze-website
   * Trigger website analysis (placeholder for future implementation)
   */
  @Post('analyze-website')
  @ApiOperation({ summary: 'Trigger website analysis and scraping' })
  @ApiResponse({ status: 200, description: 'Website analysis initiated' })
  async analyzeWebsite(
    @Request() req,
    @Body() dto: AnalyzeWebsiteDto,
  ): Promise<{ message: string; url: string }> {
    const userId = req.user.id;
    return this.companyProfileService.analyzeWebsite(userId, dto.url);
  }
}

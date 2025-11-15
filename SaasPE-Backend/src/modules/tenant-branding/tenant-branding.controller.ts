import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
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
import { TenantBrandingService } from './tenant-branding.service';
import { CreateTenantBrandingDto } from './dto/create-tenant-branding.dto';
import { UpdateTenantBrandingDto } from './dto/update-tenant-branding.dto';
import { TenantBrandingResponseDto } from './dto/tenant-branding-response.dto';
import { ESignatureProviderFactory } from '../../shared/services/e-signature-provider.factory';

@ApiTags('Tenant Branding')
@ApiBearerAuth()
@Controller('tenant-branding')
@UseGuards(JwtAuthGuard)
export class TenantBrandingController {
  constructor(
    private readonly tenantBrandingService: TenantBrandingService,
    private readonly eSignatureFactory: ESignatureProviderFactory,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get tenant branding' })
  @ApiResponse({
    status: 200,
    description: 'Tenant branding retrieved successfully',
    type: TenantBrandingResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Branding not found' })
  async getTenantBranding(
    @Request() req,
  ): Promise<TenantBrandingResponseDto | null> {
    const tenantId = req.user.tenantId;
    return this.tenantBrandingService.getTenantBranding(tenantId);
  }

  @Get('e-signature-providers')
  @ApiOperation({ summary: 'Get available e-signature providers' })
  @ApiResponse({
    status: 200,
    description: 'List of available e-signature providers with details',
  })
  async getESignatureProviders() {
    return this.eSignatureFactory.getAvailableProviders();
  }

  @Post()
  @ApiOperation({ summary: 'Create tenant branding' })
  @ApiResponse({
    status: 201,
    description: 'Tenant branding created successfully',
    type: TenantBrandingResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Branding already exists' })
  async createTenantBranding(
    @Request() req,
    @Body() dto: CreateTenantBrandingDto,
  ): Promise<TenantBrandingResponseDto> {
    const tenantId = req.user.tenantId;
    return this.tenantBrandingService.createTenantBranding(tenantId, dto);
  }

  @Patch()
  @ApiOperation({ summary: 'Update tenant branding' })
  @ApiResponse({
    status: 200,
    description: 'Tenant branding updated successfully',
    type: TenantBrandingResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Branding not found' })
  async updateTenantBranding(
    @Request() req,
    @Body() dto: UpdateTenantBrandingDto,
  ): Promise<TenantBrandingResponseDto> {
    const tenantId = req.user.tenantId;
    return this.tenantBrandingService.updateTenantBranding(tenantId, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete tenant branding' })
  @ApiResponse({
    status: 204,
    description: 'Tenant branding deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Branding not found' })
  async deleteTenantBranding(@Request() req): Promise<void> {
    const tenantId = req.user.tenantId;
    await this.tenantBrandingService.deleteTenantBranding(tenantId);
  }
}

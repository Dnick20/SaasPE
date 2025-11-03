import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateTenantBrandingDto } from './dto/create-tenant-branding.dto';
import { UpdateTenantBrandingDto } from './dto/update-tenant-branding.dto';
import { TenantBrandingResponseDto } from './dto/tenant-branding-response.dto';

@Injectable()
export class TenantBrandingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get tenant branding by tenant ID
   */
  async getTenantBranding(
    tenantId: string,
  ): Promise<TenantBrandingResponseDto | null> {
    const branding = await this.prisma.tenantBranding.findUnique({
      where: { tenantId },
    });

    return branding;
  }

  /**
   * Create tenant branding
   */
  async createTenantBranding(
    tenantId: string,
    dto: CreateTenantBrandingDto,
  ): Promise<TenantBrandingResponseDto> {
    // Check if branding already exists for this tenant
    const existing = await this.prisma.tenantBranding.findUnique({
      where: { tenantId },
    });

    if (existing) {
      throw new ConflictException(
        'Branding already exists for this tenant. Use update instead.',
      );
    }

    // Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Create branding
    const branding = await this.prisma.tenantBranding.create({
      data: {
        tenantId,
        logoS3Key: dto.logoS3Key,
        logoUrl: dto.logoUrl,
        primaryColor: dto.primaryColor || '#1E40AF',
        secondaryColor: dto.secondaryColor || '#F97316',
        accentColor: dto.accentColor,
        fontFamily: dto.fontFamily || 'Inter',
        headingFont: dto.headingFont || 'Inter',
        companyName: dto.companyName,
        companyAddress: dto.companyAddress,
        companyPhone: dto.companyPhone,
        companyEmail: dto.companyEmail,
        companyWebsite: dto.companyWebsite,
        companyTagline: dto.companyTagline,
        footerText: dto.footerText,
        logoPosition: dto.logoPosition || 'header',
      },
    });

    return branding;
  }

  /**
   * Update tenant branding
   */
  async updateTenantBranding(
    tenantId: string,
    dto: UpdateTenantBrandingDto,
  ): Promise<TenantBrandingResponseDto> {
    // Check if branding exists
    const existing = await this.prisma.tenantBranding.findUnique({
      where: { tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Branding not found for this tenant');
    }

    // Update branding
    const branding = await this.prisma.tenantBranding.update({
      where: { tenantId },
      data: {
        logoS3Key:
          dto.logoS3Key !== undefined ? dto.logoS3Key : existing.logoS3Key,
        logoUrl: dto.logoUrl !== undefined ? dto.logoUrl : existing.logoUrl,
        primaryColor:
          dto.primaryColor !== undefined
            ? dto.primaryColor
            : existing.primaryColor,
        secondaryColor:
          dto.secondaryColor !== undefined
            ? dto.secondaryColor
            : existing.secondaryColor,
        accentColor:
          dto.accentColor !== undefined
            ? dto.accentColor
            : existing.accentColor,
        fontFamily:
          dto.fontFamily !== undefined ? dto.fontFamily : existing.fontFamily,
        headingFont:
          dto.headingFont !== undefined
            ? dto.headingFont
            : existing.headingFont,
        companyName:
          dto.companyName !== undefined
            ? dto.companyName
            : existing.companyName,
        companyAddress:
          dto.companyAddress !== undefined
            ? dto.companyAddress
            : existing.companyAddress,
        companyPhone:
          dto.companyPhone !== undefined
            ? dto.companyPhone
            : existing.companyPhone,
        companyEmail:
          dto.companyEmail !== undefined
            ? dto.companyEmail
            : existing.companyEmail,
        companyWebsite:
          dto.companyWebsite !== undefined
            ? dto.companyWebsite
            : existing.companyWebsite,
        companyTagline:
          dto.companyTagline !== undefined
            ? dto.companyTagline
            : existing.companyTagline,
        footerText:
          dto.footerText !== undefined ? dto.footerText : existing.footerText,
        logoPosition:
          dto.logoPosition !== undefined
            ? dto.logoPosition
            : existing.logoPosition,
      },
    });

    return branding;
  }

  /**
   * Delete tenant branding
   */
  async deleteTenantBranding(tenantId: string): Promise<void> {
    // Check if branding exists
    const existing = await this.prisma.tenantBranding.findUnique({
      where: { tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Branding not found for this tenant');
    }

    await this.prisma.tenantBranding.delete({
      where: { tenantId },
    });
  }

  /**
   * Get or create default branding for tenant
   * Useful for ensuring branding always exists when generating PDFs
   */
  async getOrCreateDefaultBranding(
    tenantId: string,
    companyName: string,
  ): Promise<TenantBrandingResponseDto> {
    let branding = await this.getTenantBranding(tenantId);

    if (!branding) {
      // Create default branding
      branding = await this.createTenantBranding(tenantId, {
        companyName,
        primaryColor: '#1E40AF',
        secondaryColor: '#F97316',
        fontFamily: 'Inter',
        headingFont: 'Inter',
        logoPosition: 'header',
      });
    }

    return branding;
  }
}

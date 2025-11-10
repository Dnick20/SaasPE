import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import {
  CreateCompanyProfileDto,
  UpdateCompanyProfileDto,
  CompanyProfileResponseDto,
} from './dto';

@Injectable()
export class CompanyProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sanitize string array: trim, dedupe (case-insensitive), filter empties
   */
  private sanitizeStringArray(arr?: string[]): string[] {
    if (!arr || !Array.isArray(arr)) {
      return [];
    }

    const trimmed = arr.map((s) => s.trim()).filter((s) => s.length > 0);
    const unique = trimmed.filter(
      (item, index, self) =>
        self.findIndex((t) => t.toLowerCase() === item.toLowerCase()) === index,
    );

    return unique;
  }

  /**
   * Transform company profile to response DTO
   */
  private toResponseDto(profile: any): CompanyProfileResponseDto {
    return {
      id: profile.id,
      userId: profile.userId,
      companyName: profile.companyName,
      website: profile.website,
      industry: profile.industry,
      targetICP: profile.targetICP,
      preferredTone: profile.preferredTone,
      productsSold: profile.productsSold || [],
      productsNotSold: profile.productsNotSold || [],
      servicesSold: profile.servicesSold || [],
      enrichmentData: profile.enrichmentData,
      scraped: profile.scraped,
      scrapedAt: profile.scrapedAt,
      defaultSettings: profile.defaultSettings,
      created: profile.created,
      updated: profile.updated,
    };
  }

  /**
   * Create company profile
   */
  async create(
    userId: string,
    dto: CreateCompanyProfileDto,
  ): Promise<CompanyProfileResponseDto> {
    // Check if profile already exists
    const existing = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException(
        'Company profile already exists. Use update instead.',
      );
    }

    const profile = await this.prisma.companyProfile.create({
      data: {
        userId,
        companyName: dto.companyName,
        website: dto.website,
        industry: dto.industry,
        targetICP: dto.targetICP,
        preferredTone: dto.preferredTone || 'professional',
        productsSold: this.sanitizeStringArray(dto.productsSold),
        productsNotSold: this.sanitizeStringArray(dto.productsNotSold),
        servicesSold: this.sanitizeStringArray(dto.servicesSold),
        enrichmentData: {},
        defaultSettings: {},
      },
    });

    // TODO: Trigger website scraping in background if website provided
    // if (dto.website) {
    //   this.websiteScraperService.scrapeWebsite(profile.id, dto.website);
    // }

    return this.toResponseDto(profile);
  }

  /**
   * Get company profile for user
   */
  async findByUserId(
    userId: string,
  ): Promise<CompanyProfileResponseDto | null> {
    const profile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });

    return profile ? this.toResponseDto(profile) : null;
  }

  /**
   * Get company profile by user ID (alias for compatibility)
   */
  async getByUserId(userId: string): Promise<CompanyProfileResponseDto | null> {
    return this.findByUserId(userId);
  }

  /**
   * Update company profile
   */
  async update(
    userId: string,
    dto: UpdateCompanyProfileDto,
  ): Promise<CompanyProfileResponseDto> {
    const profile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(
        'Company profile does not exist. Create one first.',
      );
    }

    const updated = await this.prisma.companyProfile.update({
      where: { userId },
      data: {
        ...(dto.companyName && { companyName: dto.companyName }),
        ...(dto.website && { website: dto.website }),
        ...(dto.industry && { industry: dto.industry }),
        ...(dto.targetICP && { targetICP: dto.targetICP }),
        ...(dto.preferredTone && { preferredTone: dto.preferredTone }),
        ...(dto.productsSold !== undefined && {
          productsSold: this.sanitizeStringArray(dto.productsSold),
        }),
        ...(dto.productsNotSold !== undefined && {
          productsNotSold: this.sanitizeStringArray(dto.productsNotSold),
        }),
        ...(dto.servicesSold !== undefined && {
          servicesSold: this.sanitizeStringArray(dto.servicesSold),
        }),
        ...(dto.enrichmentData && {
          enrichmentData: dto.enrichmentData as any,
        }),
        ...(dto.defaultSettings && {
          defaultSettings: dto.defaultSettings as any,
        }),
      },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Get or create company profile
   */
  async getOrCreate(
    userId: string,
    defaults?: CreateCompanyProfileDto,
  ): Promise<CompanyProfileResponseDto | null> {
    const profile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });

    if (!profile && defaults) {
      return this.create(userId, defaults);
    }

    return profile ? this.toResponseDto(profile) : null;
  }

  /**
   * Update enrichment data (from website scraping)
   */
  async updateEnrichmentData(
    userId: string,
    enrichmentData: Record<string, any>,
  ): Promise<CompanyProfileResponseDto> {
    const updated = await this.prisma.companyProfile.update({
      where: { userId },
      data: {
        enrichmentData: enrichmentData as any,
        scraped: true,
        scrapedAt: new Date(),
      },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Analyze website (stub for future implementation)
   */
  async analyzeWebsite(
    userId: string,
    url: string,
  ): Promise<{ message: string; url: string }> {
    // TODO: Implement actual website scraping/analysis
    // This is a placeholder that returns a promise for future implementation
    // Agent 3 will implement the actual scraping service

    return {
      message:
        'Website analysis will be implemented by the Website Scraper service',
      url,
    };
  }

  /**
   * Get default settings for campaigns/proposals
   */
  async getDefaultSettings(userId: string) {
    const profile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return null;
    }

    return {
      companyName: profile.companyName,
      industry: profile.industry,
      targetICP: profile.targetICP,
      preferredTone: profile.preferredTone,
      defaultSettings: profile.defaultSettings,
    };
  }
}

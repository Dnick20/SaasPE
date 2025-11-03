import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { PricingCatalogItemDto } from './dto/pricing-catalog.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class PricingCatalogService {
  constructor(private prisma: PrismaService) {}

  private async getProfile(userId: string) {
    const profile = await this.prisma.companyProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Company profile not found');
    return profile;
  }

  async list(userId: string): Promise<any[]> {
    const profile = await this.getProfile(userId);
    const settings = (profile.defaultSettings as any) || {};
    return settings.pricingCatalog || [];
  }

  async addItem(userId: string, dto: PricingCatalogItemDto): Promise<any> {
    const profile = await this.getProfile(userId);
    const settings = ((profile.defaultSettings as any) || {}) as any;
    const catalog: any[] = settings.pricingCatalog || [];
    const item = { id: randomUUID(), ...dto };
    catalog.push(item);

    const updated = await this.prisma.companyProfile.update({
      where: { userId },
      data: { defaultSettings: { ...(settings || {}), pricingCatalog: catalog } as any },
    });

    return item;
  }

  async updateItem(userId: string, id: string, dto: Partial<PricingCatalogItemDto>): Promise<any> {
    const profile = await this.getProfile(userId);
    const settings = ((profile.defaultSettings as any) || {}) as any;
    const catalog: any[] = settings.pricingCatalog || [];
    const idx = catalog.findIndex((i) => i.id === id);
    if (idx === -1) throw new NotFoundException('Catalog item not found');
    catalog[idx] = { ...catalog[idx], ...dto };

    await this.prisma.companyProfile.update({
      where: { userId },
      data: { defaultSettings: { ...(settings || {}), pricingCatalog: catalog } as any },
    });

    return catalog[idx];
  }

  async deleteItem(userId: string, id: string): Promise<{ message: string }> {
    const profile = await this.getProfile(userId);
    const settings = ((profile.defaultSettings as any) || {}) as any;
    const catalog: any[] = settings.pricingCatalog || [];
    const next = catalog.filter((i) => i.id !== id);

    await this.prisma.companyProfile.update({
      where: { userId },
      data: { defaultSettings: { ...(settings || {}), pricingCatalog: next } as any },
    });

    return { message: 'Deleted' };
  }
}



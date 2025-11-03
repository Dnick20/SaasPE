import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { ProvisionDomainDto } from './dto/provision-domain.dto';
import { DomainResponseDto } from './dto/domain-response.dto';
import { CloudflareDNSService } from '../../shared/services/cloudflare.service';
import { RegistrarService } from '../../shared/services/registrar.service';
import { SesManagementService } from '../../shared/services/ses-management.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DomainsService {
  private readonly logger = new Logger(DomainsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudflare: CloudflareDNSService,
    private readonly registrar: RegistrarService,
    private readonly sesMgmt: SesManagementService,
    private readonly config: ConfigService,
  ) {}

  async provisionDomain(
    tenantId: string,
    userId: string,
    dto: ProvisionDomainDto,
  ): Promise<DomainResponseDto> {
    const domainName = dto.domain.toLowerCase();

    if (dto.purchase) {
      await this.registrar.purchaseDomain(domainName);
    }

    // Ensure zone exists in Cloudflare
    const zone = await this.cloudflare.ensureZone(domainName);

    // Create Domain record or update if exists
    const domain = await this.prisma.domain.upsert({
      where: { tenantId_name: { tenantId, name: domainName } },
      update: { status: 'dns_configured' },
      create: {
        tenantId,
        name: domainName,
        registrar: this.config.get<string>('REGISTRAR_PROVIDER') || 'namecheap',
        status: 'purchased',
      },
    });

    // DNS Records
    const awsRegion = this.config.get<string>('AWS_REGION') || 'us-east-1';
    const mailFromHost = `feedback-smtp.${awsRegion}.amazonses.com`;
    const returnPathSub = dto.returnPathSubdomain || 'returnpath';

    const dmarcPolicy = dto.dmarcPolicy || 'none';
    const dmarcRua = dto.dmarcRua || `mailto:dmarc@${domainName}`;

    // SPF
    await this.cloudflare.upsertTxt(zone.id, domainName, 'v=spf1 include:amazonses.com ~all');
    // DMARC
    await this.cloudflare.upsertTxt(zone.id, `_dmarc.${domainName}`, `v=DMARC1; p=${dmarcPolicy}; rua=${dmarcRua}`);
    // MAIL FROM (return-path)
    await this.cloudflare.upsertCname(zone.id, `${returnPathSub}.${domainName}`, mailFromHost, false);
    await this.sesMgmt.configureMailFrom(domainName, returnPathSub);

    // SES Easy DKIM: create identity and publish CNAMEs
    const { dkimTokens } = await this.sesMgmt.ensureDomainIdentity(domainName);
    for (const token of dkimTokens) {
      const name = `${token}._domainkey.${domainName}`;
      const target = `${token}.dkim.amazonses.com`;
      await this.cloudflare.upsertCname(zone.id, name, target, false);
    }

    // Tracking Domain (optional)
    if (dto.trackingSubdomain) {
      const trackingTarget = this.config.get<string>('TRACKING_CNAME_TARGET') || 'track.saaspe.com';
      await this.cloudflare.upsertCname(zone.id, `${dto.trackingSubdomain}.${domainName}`, trackingTarget, false);
      await this.prisma.domain.update({
        where: { id: domain.id },
        data: { trackingCname: `${dto.trackingSubdomain}.${domainName}` },
      });
    }

    // Flags
    const updated = await this.prisma.domain.update({
      where: { id: domain.id },
      data: {
        status: 'dns_configured',
        spfConfigured: true,
        dmarcConfigured: true,
        dkimConfigured: dkimTokens.length > 0,
        returnPathCname: `${returnPathSub}.${domainName}`,
      },
    });

    return this.mapToDto(updated);
  }

  async getDomain(tenantId: string, id: string): Promise<DomainResponseDto> {
    const domain = await this.prisma.domain.findFirst({ where: { id, tenantId } });
    if (!domain) {
      throw new NotFoundException('Domain not found');
    }
    return this.mapToDto(domain as any);
  }

  private mapToDto(domain: any): DomainResponseDto {
    return {
      id: domain.id,
      name: domain.name,
      status: domain.status,
      spfConfigured: domain.spfConfigured,
      dkimConfigured: domain.dkimConfigured,
      dmarcConfigured: domain.dmarcConfigured,
      returnPathCname: domain.returnPathCname || undefined,
      trackingCname: domain.trackingCname || undefined,
      created: domain.created?.toISOString?.() || domain.created,
      updated: domain.updated?.toISOString?.() || domain.updated,
    };
  }
}



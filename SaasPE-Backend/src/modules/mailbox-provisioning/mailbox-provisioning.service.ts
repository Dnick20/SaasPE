import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

export interface PurchaseMailboxDto {
  provider: 'titan' | 'zoho' | 'workmail' | 'ses_managed';
  domain: string;
  localPart: string; // e.g., sales
  plan?: string;
}

@Injectable()
export class MailboxProvisioningService {
  private readonly logger = new Logger(MailboxProvisioningService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Purchase or create a mailbox seat with the selected provider.
   * NOTE: This is a stub. Integrate Titan/Zoho/WorkMail APIs here.
   */
  async purchaseMailbox(
    tenantId: string,
    userId: string,
    dto: PurchaseMailboxDto,
  ) {
    const email = `${dto.localPart}@${dto.domain}`.toLowerCase();

    this.logger.log(`Provisioning mailbox ${email} via provider ${dto.provider}`);

    // TODO: Replace with real provider API integration; for now assume success
    const mailbox = await this.prisma.mailbox.create({
      data: {
        tenantId,
        userId,
        email,
        type: dto.provider === 'ses_managed' ? 'MANAGED' : 'USER_PROVIDED',
        provider:
          dto.provider === 'titan'
            ? 'SMTP'
            : dto.provider === 'zoho'
            ? 'SMTP'
            : dto.provider === 'workmail'
            ? 'SMTP'
            : 'AWS_SES',
        status: dto.provider === 'ses_managed' ? 'ACTIVE' : 'INACTIVE',
      } as any,
    });

    return mailbox;
  }
}



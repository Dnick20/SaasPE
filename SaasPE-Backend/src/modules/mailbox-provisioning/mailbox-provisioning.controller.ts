import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MailboxProvisioningService, type PurchaseMailboxDto } from './mailbox-provisioning.service';

@Controller('providers/mailboxes')
@UseGuards(JwtAuthGuard)
export class MailboxProvisioningController {
  constructor(private readonly provisioning: MailboxProvisioningService) {}

  @Post('purchase')
  async purchase(@Request() req, @Body() body: PurchaseMailboxDto) {
    const { tenantId, userId } = req.user;
    const mailbox = await this.provisioning.purchaseMailbox(tenantId, userId, body);
    return { mailbox };
  }
}



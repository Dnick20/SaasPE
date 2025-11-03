import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { MailboxProvisioningController } from './mailbox-provisioning.controller';
import { MailboxProvisioningService } from './mailbox-provisioning.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MailboxProvisioningController],
  providers: [MailboxProvisioningService],
  exports: [MailboxProvisioningService],
})
export class MailboxProvisioningModule {}



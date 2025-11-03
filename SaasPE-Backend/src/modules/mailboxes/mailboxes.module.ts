import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MailboxesController } from './mailboxes.controller';
import { MailboxesService } from './mailboxes.service';
import { DatabaseModule } from '../../shared/database/database.module';
import { ServicesModule } from '../../shared/services/services.module';
import { GuardsModule } from '../../shared/guards/guards.module';
import { MailboxHealthCron } from './mailbox-health.cron';

@Module({
  imports: [
    DatabaseModule,
    ServicesModule,
    GuardsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [MailboxesController],
  providers: [MailboxesService, MailboxHealthCron],
  exports: [MailboxesService],
})
export class MailboxesModule {}

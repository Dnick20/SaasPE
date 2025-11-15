import { Module } from '@nestjs/common';
import { TokensController } from './tokens.controller';
import { TokensService } from './tokens.service';
import { SubscriptionSchedulerService } from './subscription-scheduler.service';
import { DatabaseModule } from '../../shared/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TokensController],
  providers: [TokensService, SubscriptionSchedulerService],
  exports: [TokensService],
})
export class TokensModule {}

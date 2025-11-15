import { Module } from '@nestjs/common';
import { EmailCreditsService } from './email-credits.service';
import { EmailCreditsController } from './email-credits.controller';
import { DatabaseModule } from '../../shared/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [EmailCreditsController],
  providers: [EmailCreditsService],
  exports: [EmailCreditsService], // Export for use in other modules (campaigns, etc.)
})
export class EmailCreditsModule {}

import { Module } from '@nestjs/common';
import { WarmupService } from './warmup.service';
import { WarmupController } from './warmup.controller';
import { DatabaseModule } from '../../shared/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [WarmupController],
  providers: [WarmupService],
  exports: [WarmupService], // Export for use in campaigns module
})
export class WarmupModule {}

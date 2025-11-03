import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { DatabaseModule } from '../../shared/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService], // Export for use in campaigns module
})
export class ContactsModule {}

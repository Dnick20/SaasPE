import { Module } from '@nestjs/common';
import { ErrorsController } from './errors.controller';
import { ErrorsService } from './errors.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../../shared/database/prisma.service';

@Module({
  controllers: [ErrorsController, AdminController],
  providers: [ErrorsService, AdminService, PrismaService],
  exports: [ErrorsService],
})
export class AdminModule {}

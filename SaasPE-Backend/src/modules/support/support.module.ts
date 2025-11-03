import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { SupportGateway } from './support.gateway';
import { DatabaseModule } from '../../shared/database/database.module';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [SupportController],
  providers: [SupportService, SupportGateway],
  exports: [SupportService],
})
export class SupportModule {}

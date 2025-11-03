import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { MicrosoftStrategy } from './strategies/microsoft.strategy';
import { AppleStrategy } from './strategies/apple.strategy';
import { GoogleAuthController } from './google-auth.controller';
import { GoogleOAuthService } from '../../shared/services/google/google-oauth.service';
import { GDocsExporterService } from '../../shared/services/google/gdocs-exporter.service';
import { UsersModule } from '../users/users.module';
import { DatabaseModule } from '../../shared/database/database.module';
import { CacheModule } from '../../shared/cache/cache.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const expiresIn =
          configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m';
        return {
          secret:
            configService.get<string>('JWT_SECRET') ||
            'your-super-secret-jwt-key-change-in-production',
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
      inject: [ConfigService],
    }),
    ConfigModule,
    UsersModule,
    DatabaseModule,
    CacheModule,
  ],
  controllers: [AuthController, GoogleAuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    MicrosoftStrategy,
    AppleStrategy,
    GoogleOAuthService,
    GDocsExporterService,
  ],
  exports: [
    AuthService,
    JwtModule,
    PassportModule,
    GoogleOAuthService,
    GDocsExporterService,
  ],
})
export class AuthModule {}

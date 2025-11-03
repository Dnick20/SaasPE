import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-apple';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID:
        configService.get<string>('APPLE_CLIENT_ID') || 'your-apple-client-id',
      teamID:
        configService.get<string>('APPLE_TEAM_ID') || 'your-apple-team-id',
      keyID: configService.get<string>('APPLE_KEY_ID') || 'your-apple-key-id',
      privateKeyLocation:
        configService.get<string>('APPLE_PRIVATE_KEY_LOCATION') ||
        './AuthKey.p8',
      callbackURL:
        configService.get<string>('APPLE_CALLBACK_URL') ||
        'http://localhost:3000/api/v1/auth/apple/callback',
      scope: ['email', 'name'],
      passReqToCallback: false,
    });
  }

  /**
   * Validate Apple OAuth callback
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    idToken: any,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    const { email, sub } = idToken;
    const { name } = profile || {};

    const user = {
      email,
      firstName: name?.firstName || '',
      lastName: name?.lastName || '',
      appleId: sub,
      accessToken,
    };

    done(null, user);
  }
}

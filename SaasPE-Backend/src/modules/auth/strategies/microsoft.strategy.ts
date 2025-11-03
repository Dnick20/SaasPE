import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-microsoft';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID:
        configService.get<string>('MICROSOFT_CLIENT_ID') ||
        'your-microsoft-client-id',
      clientSecret:
        configService.get<string>('MICROSOFT_CLIENT_SECRET') ||
        'your-microsoft-client-secret',
      callbackURL:
        configService.get<string>('MICROSOFT_CALLBACK_URL') ||
        'http://localhost:3000/api/v1/auth/microsoft/callback',
      scope: ['user.read'],
      tenant: 'common',
    });
  }

  /**
   * Validate Microsoft OAuth callback
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any) => void,
  ): Promise<void> {
    const { name, emails, id } = profile;

    const user = {
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      microsoftId: id,
      accessToken,
    };

    done(null, user);
  }
}

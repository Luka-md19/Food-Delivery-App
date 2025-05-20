import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthFacade } from '../auth/auth.facade';
import { AppConfigService } from '@app/common';
import { UserRole } from '@app/common';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly authFacade: AuthFacade,
    private readonly configService: AppConfigService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      // Extract user details from Google profile
      const googleId = profile.id;
      const email = profile.emails[0].value;
      const firstName = profile.name.givenName;
      const lastName = profile.name.familyName;

      // Delegate to AuthFacade to validate or create the user and generate tokens
      const tokenResponse = await this.authFacade.validateGoogleUser({
        googleId,
        email,
        firstName,
        lastName,
      });
      return done(null, tokenResponse);
    } catch (error) {
      return done(new InternalServerErrorException(error), false);
    }
  }
}

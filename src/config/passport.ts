import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

export type GoogleProfilePayload = {
  email: string | null;
  googleId: string;
  firstName: string;
  lastName: string;
};

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    const clientID = (process.env.GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
    const callbackURL = (process.env.GOOGLE_CALLBACK_URL || '').trim();

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['profile', 'email'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): GoogleProfilePayload {
    const email = profile.emails?.[0]?.value ?? null;
    const firstName = profile.name?.givenName ?? '';
    const lastName = profile.name?.familyName ?? '';

    return {
      email,
      googleId: profile.id,
      firstName,
      lastName,
    };
  }
}

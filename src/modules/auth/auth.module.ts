import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailVerificationToken } from '../../database/entities/email-verification-token.entity';
import { PasswordResetToken } from '../../database/entities/password-reset-token.entity';
import { User } from '../../database/entities/user.entity';
import { UserProfile } from '../../database/entities/user-profile.entity';
import { GoogleStrategy } from '../../config/passport';
import { EmailService } from '../../common/services/email.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserProfile,
      EmailVerificationToken,
      PasswordResetToken,
    ]),
    PassportModule.register({ session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const readString = (key: string, fallback?: string) => {
          const value = configService.get<string | Uint8Array>(key);
          if (typeof value === 'string') {
            return value;
          }
          if (value instanceof Uint8Array) {
            return Buffer.from(value).toString();
          }
          return fallback;
        };

        return {
          secret: readString('JWT_SECRET', 'your-secret-key'),
          signOptions: {
            expiresIn:
              (readString('JWT_EXPIRATION', '7d') ?? '7d') as StringValue,
          },
        };
      },
    }),
  ],
  providers: [AuthService, GoogleStrategy, EmailService],
  controllers: [AuthController],
})
export class AuthModule {}

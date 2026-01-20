import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { User } from '../../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private readString(key: string, fallback?: string) {
    const value = this.configService.get<string | Uint8Array>(key);
    if (typeof value === 'string') {
      return value;
    }
    if (value instanceof Uint8Array) {
      return Buffer.from(value).toString();
    }
    return fallback;
  }

  async signAccessToken(user: User) {
    const expiresIn = (this.readString('JWT_EXPIRATION', '7d') ??
      '7d') as StringValue;
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn,
    });

    return { accessToken, expiresIn };
  }
}

import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';
import type { Role } from '../middlewares/auth.middleware';

type JwtPayload = {
  sub?: string;
  role?: string;
  email?: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
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

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: readString('JWT_SECRET', 'your-secret-key'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User inactive');
    }

    return { id: user.id, role: user.role as Role };
  }
}

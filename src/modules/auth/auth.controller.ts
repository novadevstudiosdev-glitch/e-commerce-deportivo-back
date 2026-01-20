import {
  BadRequestException,
  ConflictException,
  Controller,
  InternalServerErrorException,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiBody,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { loginSchema, registerSchema } from '../../schemas/auth.schema';
import { User } from '../../entities/user.entity';
import { UserProfile } from '../../entities/user-profile.entity';
import { AuthService } from './auth.service';
import { LoginRequestDto, LoginResponseDto } from './dto/login.dto';
import {
  RegisterRequestDto,
  RegisterResponseDto,
} from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  @ApiBody({ type: LoginRequestDto })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Req() req: Request): Promise<LoginResponseDto> {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue.path.join('.') || 'body';
      throw new BadRequestException(`${field}: ${issue.message}`);
    }

    const { email, password } = parsed.data;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { accessToken, expiresIn } =
      await this.authService.signAccessToken(user);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
    };
  }

  @Post('register')
  @ApiBody({ type: RegisterRequestDto })
  @ApiCreatedResponse({ type: RegisterResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiConflictResponse({ description: 'Email already registered' })
  async register(@Req() req: Request): Promise<RegisterResponseDto> {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue.path.join('.') || 'body';
      throw new BadRequestException(`${field}: ${issue.message}`);
    }

    const { email, password, firstName, lastName, phone } = parsed.data;

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    try {
      const result = await this.userRepository.manager.transaction(
        async (manager) => {
          const userRepo = manager.getRepository(User);
          const profileRepo = manager.getRepository(UserProfile);

          const user = userRepo.create({
            email,
            password: passwordHash,
            role: 'customer',
            isActive: true,
            emailVerified: false,
          });

          const savedUser = await userRepo.save(user);

          const profile = profileRepo.create({
            userId: savedUser.id,
            firstName,
            lastName,
            phone: phone ?? null,
          });

          const savedProfile = await profileRepo.save(profile);

          return { user: savedUser, profile: savedProfile };
        },
      );

      return {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        profile: {
          first_name: result.profile.firstName,
          last_name: result.profile.lastName,
          phone: result.profile.phone,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException('Internal server error');
    }
  }
}

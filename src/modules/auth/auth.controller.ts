import {
  BadRequestException,
  ConflictException,
  Controller,
  InternalServerErrorException,
  Next,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
  Get,
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
import crypto from 'crypto';
import passport from 'passport';
import type { NextFunction, Request, Response } from 'express';
import { IsNull, MoreThan, Repository } from 'typeorm';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './schemas/auth.schema';
import { User } from '../../database/entities/user.entity';
import { UserProfile } from '../../database/entities/user-profile.entity';
import { ConfigService } from '@nestjs/config';
import { EmailVerificationToken } from '../../database/entities/email-verification-token.entity';
import { PasswordResetToken } from '../../database/entities/password-reset-token.entity';
import { EmailService } from '../../common/services/email.service';
import { AuthService } from './auth.service';
import { LoginRequestDto, LoginResponseDto } from './dto/login.dto';
import {
  RegisterRequestDto,
  RegisterResponseDto,
} from './dto/register.dto';
import { GoogleProfilePayload } from '../../config/passport';
import { Cart } from '../../database/entities/Cart';
import { CartItem } from '../../database/entities/CartItem';
import {
  clearCartSessionCookie,
  getCartSessionId,
} from '../../common/utils/cart-session';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cooldowns = new Map<string, number>();
  private readonly cooldownMs = 60_000;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(EmailVerificationToken)
    private readonly emailVerificationTokenRepository: Repository<EmailVerificationToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
  ) {}

  private getFrontendUrl() {
    const value = this.configService.get<string>('FRONTEND_URL');
    return value || 'http://localhost:3000';
  }

  private getBackendUrl() {
    const value = this.configService.get<string>('BACKEND_URL');
    const port = this.configService.get<string>('PORT') || '3000';
    const fallback = `http://localhost:${port}`;
    const base = value || fallback;
    return base.endsWith('/') ? base.slice(0, -1) : base;
  }

  private isEmailFlowEnabled() {
    const value = this.configService.get<string>('EMAIL_FLOW_ENABLED');
    return value === 'true';
  }

  private allowSend(email: string, purpose: 'verify' | 'reset') {
    const key = `${purpose}:${email.toLowerCase()}`;
    const now = Date.now();
    const last = this.cooldowns.get(key);

    if (last && now - last < this.cooldownMs) {
      return false;
    }

    this.cooldowns.set(key, now);
    return true;
  }

  private createToken() {
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, tokenHash };
  }

  private hasGoogleConfig() {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackUrl = this.configService.get<string>('GOOGLE_CALLBACK_URL');
    return !!clientId && !!clientSecret && !!callbackUrl;
  }

  @Get('google')
  googleAuth(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    if (!this.hasGoogleConfig()) {
      const frontendUrl = this.getFrontendUrl();
      const redirectUrl = `${frontendUrl}/auth/callback?error=google_not_configured`;
      return res.redirect(redirectUrl);
    }

    return passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
    })(req, res, next);
  }

  @Get('google/callback')
  googleAuthCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    const frontendUrl = this.getFrontendUrl();

    if (!this.hasGoogleConfig()) {
      const redirectUrl = `${frontendUrl}/auth/callback?error=google_not_configured`;
      return res.redirect(redirectUrl);
    }

    return passport.authenticate(
      'google',
      { session: false },
      async (error: Error | null, payload?: GoogleProfilePayload) => {
        if (error || !payload?.email) {
          const reason = error ? 'google_auth_failed' : 'email_required';
          const redirectUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(
            reason,
          )}`;
          return res.redirect(redirectUrl);
        }

        try {
          const user = await this.findOrCreateGoogleUser(payload);
          if (this.isEmailFlowEnabled() && !user.emailVerified) {
            const redirectUrl = `${frontendUrl}/auth/callback?error=email_not_verified`;
            return res.redirect(redirectUrl);
          }
          try {
            const merged = await this.mergeGuestCart(req, user.id);
            if (merged) {
              clearCartSessionCookie(res);
            }
          } catch (error) {
            console.warn('[Auth] Failed to merge guest cart', error);
          }
          const { accessToken } = await this.authService.signAccessToken(user);
          const redirectUrl = `${frontendUrl}/auth/callback?token=${encodeURIComponent(
            accessToken,
          )}`;
          return res.redirect(redirectUrl);
        } catch (err) {
          const reason =
            err instanceof ConflictException
              ? 'google_id_conflict'
              : 'google_auth_failed';
          const redirectUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(
            reason,
          )}`;
          return res.redirect(redirectUrl);
        }
      },
    )(req, res, next);
  }

  @Post('login')
  @ApiBody({ type: LoginRequestDto })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
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

    if (this.isEmailFlowEnabled() && !user.emailVerified) {
      throw new UnauthorizedException('Email not verified');
    }

    try {
      const merged = await this.mergeGuestCart(req, user.id);
      if (merged) {
        clearCartSessionCookie(res);
      }
    } catch (error) {
      console.warn('[Auth] Failed to merge guest cart', error);
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

      if (this.isEmailFlowEnabled() && !result.user.emailVerified) {
        try {
          await this.issueEmailVerification(result.user);
        } catch (error) {
          console.warn('[Auth] Failed to send verification email');
        }
      }

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

  @Post('verify-email')
  async verifyEmail(@Req() req: Request) {
    if (!this.isEmailFlowEnabled()) {
      throw new ServiceUnavailableException('Email verification disabled');
    }

    const parsed = verifyEmailSchema.safeParse(req.body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue.path.join('.') || 'body';
      throw new BadRequestException(`${field}: ${issue.message}`);
    }

    const { email, token } = parsed.data;
    return this.completeEmailVerification(email, token);
  }

  @Get('verify-email')
  async verifyEmailLink(@Req() req: Request, @Res() res: Response) {
    if (!this.isEmailFlowEnabled()) {
      return res.status(503).send('Email verification disabled');
    }

    const email = req.query.email;
    const token = req.query.token;

    if (typeof email !== 'string' || typeof token !== 'string') {
      return res.status(400).send('Invalid verification link');
    }

    try {
      await this.completeEmailVerification(email, token);
      return res
        .status(200)
        .send('Email verified. You can close this tab.');
    } catch (error) {
      return res.status(400).send('Invalid or expired token');
    }
  }

  @Post('resend-verification')
  async resendVerification(@Req() req: Request) {
    if (!this.isEmailFlowEnabled()) {
      return { ok: true };
    }

    const parsed = resendVerificationSchema.safeParse(req.body);

    if (!parsed.success) {
      return { ok: true };
    }

    const { email } = parsed.data;

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user || user.emailVerified) {
      return { ok: true };
    }

    if (!this.allowSend(email, 'verify')) {
      return { ok: true };
    }

    const now = new Date();
    await this.emailVerificationTokenRepository.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: now },
    );

    await this.issueEmailVerification(user);
    return { ok: true };
  }

  @Post('forgot-password')
  async forgotPassword(@Req() req: Request) {
    if (!this.isEmailFlowEnabled()) {
      return { ok: true };
    }

    const parsed = forgotPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      return { ok: true };
    }

    const { email } = parsed.data;

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      return { ok: true };
    }

    if (!this.allowSend(email, 'reset')) {
      return { ok: true };
    }

    const now = new Date();
    await this.passwordResetTokenRepository.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: now },
    );

    await this.issuePasswordReset(user);
    return { ok: true };
  }

  @Post('reset-password')
  async resetPassword(@Req() req: Request) {
    if (!this.isEmailFlowEnabled()) {
      throw new ServiceUnavailableException('Password reset disabled');
    }

    const parsed = resetPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue.path.join('.') || 'body';
      throw new BadRequestException(`${field}: ${issue.message}`);
    }

    const { email, token, newPassword } = parsed.data;

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const now = new Date();

    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: {
        userId: user.id,
        tokenHash,
        usedAt: IsNull(),
        expiresAt: MoreThan(now),
      },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.userRepository.manager.transaction(async (manager) => {
      user.password = passwordHash;
      resetToken.usedAt = now;
      await manager.getRepository(User).save(user);
      await manager.getRepository(PasswordResetToken).save(resetToken);
    });

    return { ok: true };
  }

  private async issueEmailVerification(user: User) {
    const { token, tokenHash } = this.createToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.emailVerificationTokenRepository.save({
      userId: user.id,
      tokenHash,
      expiresAt,
      usedAt: null,
    });

    const link = `${this.getBackendUrl()}/api/auth/verify-email?token=${encodeURIComponent(
      token,
    )}&email=${encodeURIComponent(user.email)}`;

    const subject = 'Verifica tu cuenta en SportShop';
    const text = [
      'Hola,',
      'Gracias por registrarte en SportShop.',
      `Verifica tu cuenta aqui: ${link}`,
      'Si no creaste esta cuenta, podes ignorar este email.',
    ].join('\n');

    const html = this.buildEmailHtml({
      title: 'Verifica tu cuenta',
      intro: 'Gracias por registrarte en SportShop. Para activar tu cuenta, hace clic en el boton.',
      buttonText: 'Verificar cuenta',
      buttonUrl: link,
      outro: 'Si no creaste esta cuenta, podes ignorar este email.',
    });

    await this.emailService.sendMail({
      to: user.email,
      subject,
      text,
      html,
    });
  }

  private async issuePasswordReset(user: User) {
    const { token, tokenHash } = this.createToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.passwordResetTokenRepository.save({
      userId: user.id,
      tokenHash,
      expiresAt,
      usedAt: null,
    });

    const link = `${this.getFrontendUrl()}/reset-password?token=${encodeURIComponent(
      token,
    )}&email=${encodeURIComponent(user.email)}`;

    const subject = 'Recupera tu contrasena en SportShop';
    const text = [
      'Hola,',
      'Recibimos una solicitud para restablecer tu contrasena.',
      `Cambia tu contrasena aqui: ${link}`,
      'Si no fuiste vos, podes ignorar este email.',
    ].join('\n');

    const html = this.buildEmailHtml({
      title: 'Recupera tu contrasena',
      intro:
        'Recibimos una solicitud para restablecer tu contrasena. Si fuiste vos, hace clic en el boton.',
      buttonText: 'Cambiar contrasena',
      buttonUrl: link,
      outro: 'Si no fuiste vos, podes ignorar este email.',
    });

    await this.emailService.sendMail({
      to: user.email,
      subject,
      text,
      html,
    });
  }

  private buildEmailHtml(options: {
    title: string;
    intro: string;
    buttonText: string;
    buttonUrl: string;
    outro?: string;
  }) {
    const { title, intro, buttonText, buttonUrl, outro } = options;
    const brand = 'SportShop';

    return `
      <div style="background-color:#f4f6fb;padding:24px 0;font-family:Arial,sans-serif;color:#111827;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
          <tr>
            <td align="center" style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(17,24,39,0.08);">
                <tr>
                  <td style="padding:20px 28px;background:#0ea5e9;color:#ffffff;">
                    <div style="font-size:18px;font-weight:700;letter-spacing:0.5px;">${brand}</div>
                    <div style="font-size:12px;opacity:0.9;">Tu tienda deportiva</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#0f172a;">${title}</h1>
                    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#334155;">${intro}</p>
                    <div style="margin:24px 0;">
                      <a href="${buttonUrl}" style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;">
                        ${buttonText}
                      </a>
                    </div>
                    <p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.6;">
                      Si el boton no funciona, copia y pega este link en tu navegador:
                      <br />
                      <span style="word-break:break-all;color:#0f172a;">${buttonUrl}</span>
                    </p>
                    ${
                      outro
                        ? `<p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">${outro}</p>`
                        : ''
                    }
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 28px;background:#f8fafc;color:#94a3b8;font-size:12px;">
                    © ${new Date().getFullYear()} ${brand}. Todos los derechos reservados.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  private async completeEmailVerification(email: string, token: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (user.emailVerified) {
      return { ok: true };
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const now = new Date();

    const verification = await this.emailVerificationTokenRepository.findOne({
      where: {
        userId: user.id,
        tokenHash,
        usedAt: IsNull(),
        expiresAt: MoreThan(now),
      },
    });

    if (!verification) {
      throw new BadRequestException('Invalid or expired token');
    }

    await this.userRepository.manager.transaction(async (manager) => {
      user.emailVerified = true;
      verification.usedAt = now;
      await manager.getRepository(User).save(user);
      await manager.getRepository(EmailVerificationToken).save(verification);
    });

    return { ok: true };
  }

  private async mergeGuestCart(req: Request, userId: string) {
    const sessionId = getCartSessionId(req);
    if (!sessionId) {
      return false;
    }

    await this.userRepository.manager.transaction(async (manager) => {
      const cartRepo = manager.getRepository(Cart);
      const itemRepo = manager.getRepository(CartItem);

      const guestCart = await cartRepo.findOne({
        where: { sessionId },
        relations: { items: true },
      });

      if (!guestCart) {
        return;
      }

      const userCart = await cartRepo.findOne({
        where: { userId },
        relations: { items: true },
      });

      if (!userCart) {
        guestCart.userId = userId;
        guestCart.sessionId = null;
        await cartRepo.save(guestCart);
        return;
      }

      const existingByProduct = new Map(
        (userCart.items ?? []).map((item) => [item.productId, item]),
      );

      for (const guestItem of guestCart.items ?? []) {
        const existing = existingByProduct.get(guestItem.productId);
        if (existing) {
          existing.quantity += guestItem.quantity;
          await itemRepo.save(existing);
        } else {
          const newItem = itemRepo.create({
            cartId: userCart.id,
            productId: guestItem.productId,
            quantity: guestItem.quantity,
          });
          await itemRepo.save(newItem);
        }
      }

      await cartRepo.delete({ id: guestCart.id });
    });

    return true;
  }

  private async findOrCreateGoogleUser(payload: GoogleProfilePayload) {
    const { email, googleId, firstName, lastName } = payload;
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    const emailFlowEnabled = this.isEmailFlowEnabled();

    if (existingUser) {
      if (existingUser.googleId && existingUser.googleId !== googleId) {
        throw new ConflictException('Google account mismatch');
      }

      if (!existingUser.googleId) {
        existingUser.googleId = googleId;
      }

      if (!existingUser.emailVerified) {
        if (!emailFlowEnabled) {
          existingUser.emailVerified = true;
        } else if (this.allowSend(email, 'verify')) {
          try {
            await this.issueEmailVerification(existingUser);
          } catch (error) {
            console.warn('[Auth] Failed to send verification email');
          }
        }
      }

      return this.userRepository.save(existingUser);
    }

    const user = this.userRepository.create({
      email,
      googleId,
      password: null,
      role: 'customer',
      isActive: true,
      emailVerified: !emailFlowEnabled,
    });

    const savedUser = await this.userRepository.save(user);

    const profile = this.userProfileRepository.create({
      userId: savedUser.id,
      firstName: firstName || '',
      lastName: lastName || '',
      phone: null,
    });

    await this.userProfileRepository.save(profile);

    if (emailFlowEnabled && !savedUser.emailVerified) {
      try {
        await this.issueEmailVerification(savedUser);
      } catch (error) {
        console.warn('[Auth] Failed to send verification email');
      }
    }

    return savedUser;
  }
}

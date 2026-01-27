import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../../../database/data-source';
import { User } from '../../../database/entities/user.entity';
import { UserProfile } from '../../../database/entities/user-profile.entity';
import { registerSchema } from '../schemas/auth.schema';

let dataSourceInit: Promise<void> | null = null;

async function ensureDataSource() {
  if (AppDataSource.isInitialized) {
    return;
  }

  if (!dataSourceInit) {
    dataSourceInit = AppDataSource.initialize().then(() => undefined);
  }

  await dataSourceInit;
}

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'body';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  const { email, password, firstName, lastName, phone } = parsed.data;

  try {
    await ensureDataSource();

    const existingUser = await AppDataSource.getRepository(User).findOne({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await AppDataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const profileRepo = manager.getRepository(UserProfile);

      const user = userRepo.create({
        email,
        password: passwordHash,
        role: 'usuario',
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
    });

    return res.status(201).json({
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      profile: {
        first_name: result.profile.firstName,
        last_name: result.profile.lastName,
        phone: result.profile.phone,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

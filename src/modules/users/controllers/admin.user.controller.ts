import type { Request, Response } from 'express';
import { AppDataSource } from '../../../database/data-source';
import { User } from '../../../database/entities/user.entity';
import { UserProfile } from '../../../database/entities/user-profile.entity';
import { ensureAdmin } from '../../../common/utils/ensure-admin';
import {
  adminUserQuerySchema,
  adminUserUpdateSchema,
} from '../schemas/admin.user.schema';

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

function getParamId(req: Request, res: Response) {
  const id = req.params.id;
  if (!id || Array.isArray(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return null;
  }
  return id;
}

function mapProfile(profile: UserProfile | null) {
  if (!profile) return null;

  return {
    first_name: profile.firstName,
    last_name: profile.lastName,
    dni: profile.dni,
    phone: profile.phone,
    date_of_birth: profile.dateOfBirth,
    avatar_url: profile.avatarUrl,
  };
}

function buildUserResponse(user: User) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    is_active: user.isActive,
    email_verified: user.emailVerified,
    profile: mapProfile(user.profile ?? null),
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

export async function listUsers(req: Request, res: Response) {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const parsed = adminUserQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'query';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  await ensureDataSource();

  const { page, limit, q, role, is_active } = parsed.data;

  const qb = AppDataSource.getRepository(User)
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.profile', 'profile')
    .orderBy('user.created_at', 'DESC');
  qb.where('1=1');

  if (q) {
    qb.andWhere(
      '(user.email ILIKE :q OR profile.firstName ILIKE :q OR profile.lastName ILIKE :q)',
      { q: `%${q}%` },
    );
  }

  if (role) {
    qb.andWhere('user.role = :role', { role });
  }

  if (is_active !== undefined) {
    qb.andWhere('user.is_active = :isActive', { isActive: is_active });
  }

  const [items, total] = await qb
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();

  return res.json({
    page,
    limit,
    total,
    data: items.map(buildUserResponse),
  });
}

export async function updateUserById(req: Request, res: Response) {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const id = getParamId(req, res);
  if (!id) {
    return;
  }

  const parsed = adminUserUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'body';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  await ensureDataSource();

  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({
    where: { id },
    relations: { profile: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const {
    email,
    role,
    is_active,
    email_verified,
    first_name,
    last_name,
    dni,
    phone,
    date_of_birth,
    avatar_url,
  } = parsed.data;

  if (email && email !== user.email) {
    const existing = await userRepo.findOne({ where: { email } });
    if (existing && existing.id !== user.id) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    user.email = email;
  }

  if (role !== undefined) {
    user.role = role;
  }

  if (is_active !== undefined) {
    user.isActive = is_active;
  }

  if (email_verified !== undefined) {
    user.emailVerified = email_verified;
  }

  const updatedUser = await AppDataSource.manager.transaction(
    async (manager) => {
      const profileRepo = manager.getRepository(UserProfile);

      let profile = user.profile;
      if (!profile) {
        profile = profileRepo.create({
          userId: user.id,
          firstName: first_name ?? '',
          lastName: last_name ?? '',
        });
      }

      if (first_name !== undefined) {
        profile.firstName = first_name;
      }
      if (last_name !== undefined) {
        profile.lastName = last_name;
      }
      if (dni !== undefined) {
        profile.dni = dni;
      }
      if (phone !== undefined) {
        profile.phone = phone;
      }
      if (date_of_birth !== undefined) {
        profile.dateOfBirth = date_of_birth ? new Date(date_of_birth) : null;
      }
      if (avatar_url !== undefined) {
        profile.avatarUrl = avatar_url;
      }

      await manager.getRepository(User).save(user);
      await profileRepo.save(profile);

      return manager.getRepository(User).findOne({
        where: { id: user.id },
        relations: { profile: true },
      });
    },
  );

  if (!updatedUser) {
    return res.status(500).json({ error: 'Unable to update user' });
  }

  return res.json(buildUserResponse(updatedUser));
}

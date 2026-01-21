import type { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Address } from '../entities/address.entity';
import { EmailVerificationToken } from '../entities/email-verification-token.entity';
import { UserPreference } from '../entities/user-preference.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { User } from '../entities/user.entity';
import {
  addressCreateSchema,
  addressUpdateSchema,
  updateMeSchema,
} from '../schemas/user.schema';
import crypto from 'crypto';
import { EmailService } from '../services/email.service';
import { ConfigService } from '@nestjs/config';

let dataSourceInit: Promise<void> | null = null;
const emailService = new EmailService(new ConfigService());

async function ensureDataSource() {
  if (AppDataSource.isInitialized) {
    return;
  }

  if (!dataSourceInit) {
    dataSourceInit = AppDataSource.initialize().then(() => undefined);
  }

  await dataSourceInit;
}

function getUserId(req: Request, res: Response) {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  return req.user.id;
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
  if (!profile) {
    return null;
  }

  return {
    first_name: profile.firstName,
    last_name: profile.lastName,
    dni: profile.dni,
    phone: profile.phone,
    date_of_birth: profile.dateOfBirth,
    avatar_url: profile.avatarUrl,
  };
}

function mapAddress(address: Address) {
  return {
    id: address.id,
    full_name: address.fullName,
    phone: address.phone,
    street_address: address.streetAddress,
    city: address.city,
    state: address.state,
    postal_code: address.postalCode,
    country: address.country,
    is_default: address.isDefault,
  };
}

function mapPreferences(preference: UserPreference | null) {
  if (!preference) {
    return null;
  }

  return {
    newsletter: preference.newsletter,
    promotions: preference.promotions,
    order_updates: preference.orderUpdates,
    new_products: preference.newProducts,
    preferred_shoe_size: preference.preferredShoeSize,
    preferred_clothing_size: preference.preferredClothingSize,
    favorite_sports: preference.favoriteSports,
  };
}

function buildUserResponse(user: User) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    email_verified: user.emailVerified,
    profile: mapProfile(user.profile ?? null),
    addresses: (user.addresses ?? []).map(mapAddress),
    preferences: mapPreferences(user.preference ?? null),
  };
}

function isEmailFlowEnabled() {
  return process.env.EMAIL_FLOW_ENABLED === 'true';
}

async function issueEmailVerification(user: User) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await AppDataSource.getRepository(EmailVerificationToken).save({
    userId: user.id,
    tokenHash,
    expiresAt,
    usedAt: null,
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const link = `${frontendUrl}/verify-email?token=${encodeURIComponent(
    token,
  )}&email=${encodeURIComponent(user.email)}`;

  await emailService.sendMail({
    to: user.email,
    subject: 'Verify your email',
    text: `Verify your email: ${link}`,
  });
}

export async function getMe(req: Request, res: Response) {
  const userId = getUserId(req, res);
  if (!userId) {
    return;
  }

  await ensureDataSource();

  const user = await AppDataSource.getRepository(User).findOne({
    where: { id: userId },
    relations: {
      profile: true,
      addresses: true,
      preference: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(buildUserResponse(user));
}

export async function updateMe(req: Request, res: Response) {
  const userId = getUserId(req, res);
  if (!userId) {
    return;
  }

  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'body';
    res.status(400).json({ error: `${field}: ${issue.message}` });
    return;
  }

  const {
    email,
    first_name,
    last_name,
    dni,
    phone,
    date_of_birth,
    avatar_url,
  } = parsed.data;

  await ensureDataSource();

  const userRepo = AppDataSource.getRepository(User);

  const user = await userRepo.findOne({
    where: { id: userId },
    relations: { profile: true, addresses: true, preference: true },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  let emailChanged = false;

  if (email && email !== user.email) {
    const existing = await userRepo.findOne({ where: { email } });
    if (existing && existing.id !== user.id) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    user.email = email;
    user.emailVerified = false;
    emailChanged = true;
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
        relations: { profile: true, addresses: true, preference: true },
      });
    },
  );

  if (!updatedUser) {
    res.status(500).json({ error: 'Unable to update user' });
    return;
  }

  if (emailChanged && isEmailFlowEnabled()) {
    try {
      await issueEmailVerification(updatedUser);
    } catch (error) {
      console.warn('[Users] Failed to send verification email');
    }
  }

  res.json(buildUserResponse(updatedUser));
}

export async function listAddresses(req: Request, res: Response) {
  const userId = getUserId(req, res);
  if (!userId) {
    return;
  }

  await ensureDataSource();

  const addresses = await AppDataSource.getRepository(Address).find({
    where: { userId },
    order: { createdAt: 'DESC' },
  });

  res.json(addresses.map(mapAddress));
}

export async function createAddress(req: Request, res: Response) {
  const userId = getUserId(req, res);
  if (!userId) {
    return;
  }

  const parsed = addressCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'body';
    res.status(400).json({ error: `${field}: ${issue.message}` });
    return;
  }

  await ensureDataSource();

  const {
    full_name,
    phone,
    street_address,
    city,
    state,
    postal_code,
    country,
    is_default,
  } = parsed.data;

  const addressRepo = AppDataSource.getRepository(Address);

  const address = addressRepo.create({
    userId,
    fullName: full_name,
    phone,
    streetAddress: street_address,
    city,
    state,
    postalCode: postal_code,
    country,
    isDefault: !!is_default,
  });

  const saved = await AppDataSource.manager.transaction(async (manager) => {
    const repo = manager.getRepository(Address);

    if (address.isDefault) {
      await repo.update({ userId }, { isDefault: false });
    }

    const created = await repo.save(address);
    return created;
  });

  res.status(201).json(mapAddress(saved));
}

export async function updateAddress(req: Request, res: Response) {
  const userId = getUserId(req, res);
  if (!userId) {
    return;
  }

  const parsed = addressUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'body';
    res.status(400).json({ error: `${field}: ${issue.message}` });
    return;
  }

  const id = getParamId(req, res);
  if (!id) {
    return;
  }

  await ensureDataSource();

  const addressRepo = AppDataSource.getRepository(Address);
  const address = await addressRepo.findOne({ where: { id, userId } });

  if (!address) {
    res.status(404).json({ error: 'Address not found' });
    return;
  }

  const {
    full_name,
    phone,
    street_address,
    city,
    state,
    postal_code,
    country,
    is_default,
  } = parsed.data;

  if (full_name !== undefined) {
    address.fullName = full_name;
  }
  if (phone !== undefined) {
    address.phone = phone;
  }
  if (street_address !== undefined) {
    address.streetAddress = street_address;
  }
  if (city !== undefined) {
    address.city = city;
  }
  if (state !== undefined) {
    address.state = state;
  }
  if (postal_code !== undefined) {
    address.postalCode = postal_code;
  }
  if (country !== undefined) {
    address.country = country;
  }
  if (is_default !== undefined) {
    address.isDefault = is_default;
  }

  const saved = await AppDataSource.manager.transaction(async (manager) => {
    const repo = manager.getRepository(Address);

    if (address.isDefault) {
      await repo.update({ userId }, { isDefault: false });
    }

    const updated = await repo.save(address);
    return updated;
  });

  res.json(mapAddress(saved));
}

export async function deleteAddress(req: Request, res: Response) {
  const userId = getUserId(req, res);
  if (!userId) {
    return;
  }

  const id = getParamId(req, res);
  if (!id) {
    return;
  }

  await ensureDataSource();

  const addressRepo = AppDataSource.getRepository(Address);
  const address = await addressRepo.findOne({ where: { id, userId } });

  if (!address) {
    res.status(404).json({ error: 'Address not found' });
    return;
  }

  const wasDefault = address.isDefault;

  await AppDataSource.manager.transaction(async (manager) => {
    const repo = manager.getRepository(Address);
    await repo.remove(address);

    if (wasDefault) {
      const latest = await repo.findOne({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      if (latest) {
        latest.isDefault = true;
        await repo.save(latest);
      }
    }
  });

  res.status(204).send();
}

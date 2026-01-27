import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../../../database/data-source';
import { User } from '../../../database/entities/user.entity';

export type Role = 'usuario' | 'admin' | 'vendedor';

export type AuthUser = {
  id: string;
  role: Role;
};

type JwtPayload = {
  sub?: string;
  role?: Role | 'customer';
};

const VALID_ROLES: Role[] = ['usuario', 'admin', 'vendedor'];

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

async function getUserStatus(userId: string) {
  await ensureDataSource();
  const user = await AppDataSource.getRepository(User).findOne({
    where: { id: userId },
  });

  if (!user) {
    return { exists: false, isActive: false };
  }

  return { exists: true, isActive: user.isActive };
}

function normalizeRole(role: JwtPayload['role']): Role | null {
  if (!role) {
    return null;
  }
  if (role === 'customer') {
    return 'usuario';
  }
  return role;
}

function extractToken(header: string | undefined) {
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');

  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = extractToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({ error: 'JWT_SECRET is not configured' });
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;

    const normalizedRole = normalizeRole(decoded?.role);

    if (!decoded?.sub || !normalizedRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!VALID_ROLES.includes(normalizedRole)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const status = await getUserStatus(decoded.sub);
      if (!status.exists) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (!status.isActive) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } catch (dbError) {
      return res.status(500).json({ error: 'Failed to verify user' });
    }

    req.user = {
      id: decoded.sub,
      role: normalizedRole,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = extractToken(req.headers.authorization);

  if (!token) {
    return next();
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({ error: 'JWT_SECRET is not configured' });
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;

    const normalizedRole = normalizeRole(decoded?.role);

    if (!decoded?.sub || !normalizedRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!VALID_ROLES.includes(normalizedRole)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const status = await getUserStatus(decoded.sub);
      if (!status.exists) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (!status.isActive) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } catch (dbError) {
      return res.status(500).json({ error: 'Failed to verify user' });
    }

    req.user = {
      id: decoded.sub,
      role: normalizedRole,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const continueWithRoleCheck = () => {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      return next();
    };

    if (req.user) {
      return continueWithRoleCheck();
    }

    return requireAuth(req, res, continueWithRoleCheck);
  };
}

export const requireAdmin = requireRole('admin');

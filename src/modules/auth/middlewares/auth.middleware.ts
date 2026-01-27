import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

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

export function requireAuth(req: Request, res: Response, next: NextFunction) {
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

    req.user = {
      id: decoded.sub,
      role: normalizedRole,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
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

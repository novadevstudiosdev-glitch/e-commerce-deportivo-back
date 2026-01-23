import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export type Role = 'customer' | 'admin';

export type AuthUser = {
  id: string;
  role: Role;
};

type JwtPayload = {
  sub?: string;
  role?: Role;
};

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

    if (!decoded?.sub || !decoded.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (decoded.role !== 'customer' && decoded.role !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = {
      id: decoded.sub,
      role: decoded.role,
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

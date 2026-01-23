import type { Role } from '../modules/auth/middlewares/auth.middleware';

declare global {
  namespace Express {
    interface User {
      id: string;
      role: Role;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};

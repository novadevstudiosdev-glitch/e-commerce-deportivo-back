import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';

export const CART_SESSION_COOKIE = 'cart_session';
const CART_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

function parseCookies(header?: string) {
  if (!header) {
    return {};
  }

  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rest] = part.split('=');
    if (!rawKey) {
      return acc;
    }

    const key = rawKey.trim();
    const value = rest.join('=').trim();

    if (!key) {
      return acc;
    }

    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: CART_SESSION_MAX_AGE_MS,
    path: '/',
  };
}

export function getCartSessionId(req: Request) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[CART_SESSION_COOKIE] ?? null;
}

export function createCartSessionId() {
  return randomUUID();
}

export function setCartSessionCookie(res: Response, sessionId: string) {
  res.cookie(CART_SESSION_COOKIE, sessionId, cookieOptions());
}

export function clearCartSessionCookie(res: Response) {
  res.clearCookie(CART_SESSION_COOKIE, cookieOptions());
}

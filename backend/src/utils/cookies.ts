import { CookieOptions, Response } from 'express';
import { env } from '../config/env';

const isProd = env.NODE_ENV === 'production';

export const ACCESS_COOKIE = 'orgflow_access';
export const REFRESH_COOKIE = 'orgflow_refresh';

function baseCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE || isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, baseCookieOptions(15 * 60 * 1000));
  res.cookie(REFRESH_COOKIE, refreshToken, baseCookieOptions(7 * 24 * 60 * 60 * 1000));
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
}

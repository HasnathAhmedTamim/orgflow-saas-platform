import { NextFunction, Request, Response } from 'express';
import { OrgStatus, Role, UserStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ACCESS_COOKIE } from '../utils/cookies';
import { errors } from '../utils/errors';
import { verifyAccessToken } from '../utils/jwt';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string | null;
  orgStatus: OrgStatus | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[ACCESS_COOKIE] as string | undefined;
    if (!token) {
      throw errors.unauthorized();
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });

    if (!user || user.status === UserStatus.DISABLED) {
      throw errors.unauthorized('Invalid session');
    }

    if (user.role !== Role.PLATFORM_ADMIN) {
      if (!user.organization) {
        throw errors.unauthorized('User is not linked to an organization');
      }
      if (user.organization.status === OrgStatus.SUSPENDED) {
        throw errors.suspended();
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      orgStatus: user.organization?.status ?? null,
    };

    return next();
  } catch (err) {
    if (err instanceof Error && !(err as { isOperational?: boolean }).isOperational) {
      return next(errors.unauthorized('Invalid or expired session'));
    }
    return next(err);
  }
}

export function requireRoles(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(errors.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(errors.forbidden());
    }
    return next();
  };
}

export function requireTenant(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(errors.unauthorized());
  }
  if (req.user.role === Role.PLATFORM_ADMIN) {
    return next();
  }
  if (!req.user.organizationId) {
    return next(errors.tenantDenied());
  }
  return next();
}

/** Ensures a requested org id matches the authenticated tenant (platform admin exempt). */
export function assertTenantAccess(user: AuthUser, organizationId: string) {
  if (user.role === Role.PLATFORM_ADMIN) {
    return;
  }
  if (!user.organizationId || user.organizationId !== organizationId) {
    throw errors.tenantDenied();
  }
}

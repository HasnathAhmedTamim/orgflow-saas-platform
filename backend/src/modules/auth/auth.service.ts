import {
  OrgStatus,
  Role,
  UserStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import { emailService } from '../../integrations/email/email.service';
import { AuthUser } from '../../middlewares/auth.middleware';
import {
  generateSecureToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from '../../utils/crypto';
import { errors } from '../../utils/errors';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt';

function publicUser(user: {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string | null;
  status: UserStatus;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
    status: user.status,
  };
}

async function issueTokens(user: {
  id: string;
  email: string;
  role: Role;
  organizationId: string | null;
}) {
  const jti = generateSecureToken(16);
  const refreshToken = signRefreshToken({ sub: user.id, jti });
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken };
}

export class AuthService {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { organization: true },
    });

    if (!user) {
      throw errors.invalidCredentials();
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      throw errors.invalidCredentials();
    }

    if (user.status === UserStatus.DISABLED) {
      throw errors.forbidden('Account is disabled');
    }

    if (user.role !== Role.PLATFORM_ADMIN && user.organization?.status === OrgStatus.SUSPENDED) {
      throw errors.suspended();
    }

    if (
      user.role !== Role.PLATFORM_ADMIN &&
      user.organization &&
      user.organization.status === OrgStatus.PENDING
    ) {
      throw errors.forbidden('Organization payment is still pending. Complete checkout to activate.');
    }

    const tokens = await issueTokens(user);
    return { user: publicUser(user), ...tokens };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw errors.unauthorized('Invalid or expired refresh token');
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw errors.unauthorized('Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });

    if (!user || user.status === UserStatus.DISABLED) {
      throw errors.unauthorized();
    }

    if (user.role !== Role.PLATFORM_ADMIN && user.organization?.status === OrgStatus.SUSPENDED) {
      throw errors.suspended();
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await issueTokens(user);
    return { user: publicUser(user), ...tokens };
  }

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });
    if (!user) throw errors.notFound('User not found');
    return {
      ...publicUser(user),
      organization: user.organization,
    };
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Always succeed to avoid account enumeration
    if (!user) {
      return { message: 'If an account exists, a reset email has been sent.' };
    }

    const token = generateSecureToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await emailService.sendPasswordReset(user.email, token);
    return { message: 'If an account exists, a reset email has been sent.' };
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = hashToken(token);
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw errors.validation('Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(password);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Password updated successfully' };
  }

  async updateProfile(user: AuthUser, data: { name?: string; email?: string }) {
    if (data.email && data.email.toLowerCase() !== user.email) {
      const existing = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      if (existing) throw errors.conflict('Email already in use');
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.email ? { email: data.email.toLowerCase() } : {}),
      },
    });
    return publicUser(updated);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw errors.notFound();
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) throw errors.invalidCredentials('Current password is incorrect');
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Password changed successfully' };
  }
}

export const authService = new AuthService();

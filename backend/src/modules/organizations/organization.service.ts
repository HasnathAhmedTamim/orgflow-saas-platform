import { OrgStatus, Role, UserStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { emailService } from '../../integrations/email/email.service';
import { AuthUser, assertTenantAccess } from '../../middlewares/auth.middleware';
import { generateSecureToken, hashPassword, hashToken } from '../../utils/crypto';
import { errors } from '../../utils/errors';

export class OrganizationService {
  async getMyOrganization(user: AuthUser, includeBilling = false) {
    if (!user.organizationId) throw errors.notFound('Organization not found');
    assertTenantAccess(user, user.organizationId);

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { users: true } },
      },
    });
    if (!org) throw errors.notFound('Organization not found');

    if (!includeBilling) {
      const { billingEmail: _b, stripeCustomerId: _s, ...safe } = org;
      return {
        ...safe,
        planName: org.subscriptions[0]?.plan.name ?? null,
        subscriptionStatus: org.subscriptions[0]?.status ?? null,
      };
    }

    return org;
  }

  async updateMyOrganization(
    user: AuthUser,
    data: {
      name?: string;
      contactEmail?: string | null;
      contactPhone?: string | null;
      billingEmail?: string | null;
    },
  ) {
    if (user.role !== Role.ORG_ADMIN && user.role !== Role.PLATFORM_ADMIN) {
      throw errors.forbidden();
    }
    if (!user.organizationId) throw errors.notFound();
    assertTenantAccess(user, user.organizationId);

    return prisma.organization.update({
      where: { id: user.organizationId },
      data,
    });
  }

  async listMembers(user: AuthUser) {
    if (!user.organizationId) throw errors.notFound();
    assertTenantAccess(user, user.organizationId);
    if (user.role === Role.MEMBER) throw errors.forbidden();

    return prisma.user.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async inviteMember(user: AuthUser, email: string, role: 'ORG_ADMIN' | 'MEMBER') {
    if (user.role !== Role.ORG_ADMIN) throw errors.forbidden();
    if (!user.organizationId) throw errors.notFound();

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) throw errors.conflict('A user with this email already exists');

    const token = generateSecureToken();
    const invite = await prisma.invitation.create({
      data: {
        organizationId: user.organizationId,
        email: email.toLowerCase(),
        role: role as Role,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: user.organizationId },
    });
    await emailService.sendInvitation(email.toLowerCase(), org.name, token);

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
    };
  }

  async acceptInvitation(token: string, name: string, password: string) {
    const invite = await prisma.invitation.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { organization: true },
    });

    if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
      throw errors.validation('Invalid or expired invitation');
    }

    if (invite.organization.status === OrgStatus.SUSPENDED) {
      throw errors.suspended();
    }

    const existing = await prisma.user.findUnique({
      where: { email: invite.email },
    });
    if (existing) throw errors.conflict('User already exists');

    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: invite.email,
          name,
          passwordHash,
          role: invite.role,
          status: UserStatus.ACTIVE,
          organizationId: invite.organizationId,
        },
      });
      await tx.invitation.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      });
      return newUser;
    });

    return {
      id: result.id,
      email: result.email,
      name: result.name,
      role: result.role,
      organizationId: result.organizationId,
    };
  }

  async updateMemberRole(user: AuthUser, memberId: string, role: 'ORG_ADMIN' | 'MEMBER') {
    if (user.role !== Role.ORG_ADMIN) throw errors.forbidden();
    if (!user.organizationId) throw errors.notFound();

    const member = await prisma.user.findUnique({ where: { id: memberId } });
    if (!member || member.organizationId !== user.organizationId) {
      throw errors.tenantDenied();
    }
    if (member.role === Role.PLATFORM_ADMIN) throw errors.forbidden();
    if (member.id === user.id) throw errors.validation('Cannot change your own role');

    return prisma.user.update({
      where: { id: memberId },
      data: { role: role as Role },
      select: { id: true, email: true, name: true, role: true, status: true },
    });
  }

  async removeMember(user: AuthUser, memberId: string) {
    if (user.role !== Role.ORG_ADMIN) throw errors.forbidden();
    if (!user.organizationId) throw errors.notFound();
    if (memberId === user.id) throw errors.validation('Cannot remove yourself');

    const member = await prisma.user.findUnique({ where: { id: memberId } });
    if (!member || member.organizationId !== user.organizationId) {
      throw errors.tenantDenied();
    }

    await prisma.user.delete({ where: { id: memberId } });
    return { message: 'Member removed' };
  }
}

export const organizationService = new OrganizationService();

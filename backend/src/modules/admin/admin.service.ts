import { OrgStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { errors } from '../../utils/errors';

export class AdminService {
  async stats() {
    const [
      totalOrganizations,
      activeOrganizations,
      suspendedOrganizations,
      totalUsers,
      activeSubscriptions,
      payments,
      failedPayments,
      recentSignups,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { status: OrgStatus.ACTIVE } }),
      prisma.organization.count({ where: { status: OrgStatus.SUSPENDED } }),
      prisma.user.count({ where: { role: { not: Role.PLATFORM_ADMIN } } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.payment.findMany({
        where: { status: 'SUCCEEDED' },
        select: { amountCents: true },
      }),
      prisma.payment.count({ where: { status: 'FAILED' } }),
      prisma.organization.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, status: true, createdAt: true },
      }),
    ]);

    const totalRevenueCents = payments.reduce((sum, p) => sum + p.amountCents, 0);

    return {
      totalOrganizations,
      activeOrganizations,
      suspendedOrganizations,
      totalUsers,
      activeSubscriptions,
      totalRevenueCents,
      failedPaymentCount: failedPayments,
      recentSignups,
    };
  }

  async listOrganizations(query: {
    search?: string;
    status?: OrgStatus;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const where: Prisma.OrganizationWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        include: {
          _count: { select: { users: true } },
          subscriptions: {
            include: { plan: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.organization.count({ where }),
    ]);

    return {
      items: items.map((o) => ({
        id: o.id,
        name: o.name,
        status: o.status,
        memberCount: o._count.users,
        planName: o.subscriptions[0]?.plan.name ?? null,
        signupDate: o.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async getOrganization(id: string) {
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
        },
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        },
        payments: { orderBy: { createdAt: 'desc' }, take: 50 },
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!org) throw errors.notFound('Organization not found');
    return org;
  }

  async updateOrganizationStatus(id: string, status: OrgStatus) {
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) throw errors.notFound('Organization not found');
    return prisma.organization.update({
      where: { id },
      data: { status },
    });
  }

  async listTransactions(query: {
    organizationId?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const where: Prisma.TransactionWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          organization: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}

export const adminService = new AdminService();

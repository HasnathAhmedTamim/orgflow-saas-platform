import { Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { errors } from '../../utils/errors';

export class PlanService {
  async listPublic() {
    return prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceCents: 'asc' },
    });
  }

  async listAll() {
    return prisma.plan.findMany({ orderBy: { priceCents: 'asc' } });
  }

  async create(data: {
    name: string;
    description?: string;
    priceCents: number;
    currency?: string;
    interval: 'MONTHLY' | 'YEARLY';
    features: string[];
    isActive?: boolean;
  }) {
    return prisma.plan.create({
      data: {
        name: data.name,
        description: data.description,
        priceCents: data.priceCents,
        currency: data.currency ?? 'usd',
        interval: data.interval,
        features: data.features,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      priceCents: number;
      currency: string;
      interval: 'MONTHLY' | 'YEARLY';
      features: string[];
      isActive: boolean;
    }>,
  ) {
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) throw errors.notFound('Plan not found');
    return prisma.plan.update({ where: { id }, data });
  }

  async getById(id: string) {
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) throw errors.notFound('Plan not found');
    return plan;
  }
}

export const planService = new PlanService();

export function assertPlatformAdmin(role: Role) {
  if (role !== Role.PLATFORM_ADMIN) throw errors.forbidden();
}

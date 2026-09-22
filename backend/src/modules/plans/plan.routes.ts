import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRoles } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { planSchema, updatePlanSchema } from '../shared/validation';
import { planController } from './plan.controller';

const router = Router();

router.get('/', planController.listPublic);
router.get('/all', authenticate, requireRoles(Role.PLATFORM_ADMIN), planController.listAll);
router.post(
  '/',
  authenticate,
  requireRoles(Role.PLATFORM_ADMIN),
  validate(planSchema),
  planController.create,
);
router.patch(
  '/:id',
  authenticate,
  requireRoles(Role.PLATFORM_ADMIN),
  validate(updatePlanSchema),
  planController.update,
);

export default router;

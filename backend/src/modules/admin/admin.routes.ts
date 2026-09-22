import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRoles } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { orgStatusSchema } from '../shared/validation';
import { adminController } from './admin.controller';

const router = Router();

router.use(authenticate, requireRoles(Role.PLATFORM_ADMIN));

router.get('/stats', adminController.stats);
router.get('/organizations', adminController.listOrgs);
router.get('/organizations/:id', adminController.getOrg);
router.patch(
  '/organizations/:id/status',
  validate(orgStatusSchema),
  adminController.updateOrgStatus,
);
router.get('/transactions', adminController.listTransactions);

export default router;

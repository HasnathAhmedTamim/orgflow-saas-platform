import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRoles } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { authRateLimiter } from '../../middlewares/rate-limit.middleware';
import { checkoutPlanSchema, registerSchema } from '../shared/validation';
import { paymentController } from './payment.controller';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  paymentController.register,
);
router.post('/register/:pendingId/retry', authRateLimiter, paymentController.retry);

router.get(
  '/subscriptions/me',
  authenticate,
  requireRoles(Role.ORG_ADMIN),
  paymentController.mySubscription,
);
router.post(
  '/subscriptions/upgrade',
  authenticate,
  requireRoles(Role.ORG_ADMIN),
  validate(checkoutPlanSchema),
  paymentController.upgrade,
);
router.post(
  '/subscriptions/downgrade',
  authenticate,
  requireRoles(Role.ORG_ADMIN),
  validate(checkoutPlanSchema),
  paymentController.downgrade,
);
router.post(
  '/subscriptions/cancel',
  authenticate,
  requireRoles(Role.ORG_ADMIN),
  paymentController.cancel,
);

router.get(
  '/payments',
  authenticate,
  requireRoles(Role.ORG_ADMIN),
  paymentController.payments,
);
router.get(
  '/payments/:paymentId/invoice',
  authenticate,
  requireRoles(Role.ORG_ADMIN),
  paymentController.downloadInvoice,
);
router.post(
  '/billing/portal',
  authenticate,
  requireRoles(Role.ORG_ADMIN),
  paymentController.billingPortal,
);
router.get(
  '/transactions',
  authenticate,
  requireRoles(Role.ORG_ADMIN),
  paymentController.transactions,
);

export default router;

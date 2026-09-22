import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRoles } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { inviteRateLimiter } from '../../middlewares/rate-limit.middleware';
import {
  acceptInviteSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  updateOrgSchema,
} from '../shared/validation';
import { organizationController } from './organization.controller';

const router = Router();

router.post(
  '/invitations/accept',
  inviteRateLimiter,
  validate(acceptInviteSchema),
  organizationController.acceptInvite,
);

router.get('/me', authenticate, organizationController.getMe);
router.patch(
  '/me',
  authenticate,
  requireRoles(Role.ORG_ADMIN),
  validate(updateOrgSchema),
  organizationController.updateMe,
);

router.get(
  '/me/members',
  authenticate,
  requireRoles(Role.ORG_ADMIN),
  organizationController.listMembers,
);
router.post(
  '/me/members/invite',
  authenticate,
  requireRoles(Role.ORG_ADMIN),
  inviteRateLimiter,
  validate(inviteMemberSchema),
  organizationController.invite,
);
router.patch(
  '/me/members/:id',
  authenticate,
  requireRoles(Role.ORG_ADMIN),
  validate(updateMemberRoleSchema),
  organizationController.updateMember,
);
router.delete(
  '/me/members/:id',
  authenticate,
  requireRoles(Role.ORG_ADMIN),
  organizationController.removeMember,
);

export default router;

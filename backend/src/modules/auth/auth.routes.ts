import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middlewares/validate.middleware';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../shared/validation';
import { authenticate } from '../../middlewares/auth.middleware';
import { authRateLimiter, passwordRateLimiter } from '../../middlewares/rate-limit.middleware';

const router = Router();

router.post('/login', authRateLimiter, validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, validate(updateProfileSchema), authController.updateProfile);
router.post(
  '/change-password',
  authenticate,
  passwordRateLimiter,
  validate(changePasswordSchema),
  authController.changePassword,
);
router.post(
  '/forgot-password',
  passwordRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post(
  '/reset-password',
  passwordRateLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

export default router;

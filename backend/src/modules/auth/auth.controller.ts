import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess } from '../../utils/response';
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from '../../utils/cookies';
import { errors } from '../../utils/errors';

export class AuthController {
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body.email, req.body.password);
      setAuthCookies(res, result.accessToken, result.refreshToken);
      return sendSuccess(res, { user: result.user }, 'Logged in');
    } catch (err) {
      return next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.logout(req.cookies?.[REFRESH_COOKIE]);
      clearAuthCookies(res);
      return sendSuccess(res, null, 'Logged out');
    } catch (err) {
      return next(err);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
      if (!token) {
        clearAuthCookies(res);
        return next(errors.unauthorized());
      }
      const result = await authService.refresh(token);
      setAuthCookies(res, result.accessToken, result.refreshToken);
      return sendSuccess(res, { user: result.user }, 'Token refreshed');
    } catch (err) {
      clearAuthCookies(res);
      return next(err);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.me(req.user!.id);
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.forgotPassword(req.body.email);
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.resetPassword(req.body.token, req.body.password);
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.updateProfile(req.user!, req.body);
      return sendSuccess(res, data, 'Profile updated');
    } catch (err) {
      return next(err);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.changePassword(
        req.user!.id,
        req.body.currentPassword,
        req.body.newPassword,
      );
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  };
}

export const authController = new AuthController();

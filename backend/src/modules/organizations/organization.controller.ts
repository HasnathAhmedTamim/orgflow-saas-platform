import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { organizationService } from './organization.service';
import { sendSuccess } from '../../utils/response';

export class OrganizationController {
  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const includeBilling = req.user!.role !== Role.MEMBER;
      const data = await organizationService.getMyOrganization(req.user!, includeBilling);
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  };

  updateMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await organizationService.updateMyOrganization(req.user!, req.body);
      return sendSuccess(res, data, 'Organization updated');
    } catch (err) {
      return next(err);
    }
  };

  listMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await organizationService.listMembers(req.user!);
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  };

  invite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await organizationService.inviteMember(
        req.user!,
        req.body.email,
        req.body.role,
      );
      return sendSuccess(res, data, 'Invitation sent', 201);
    } catch (err) {
      return next(err);
    }
  };

  acceptInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await organizationService.acceptInvitation(
        req.body.token,
        req.body.name,
        req.body.password,
      );
      return sendSuccess(res, data, 'Invitation accepted', 201);
    } catch (err) {
      return next(err);
    }
  };

  updateMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await organizationService.updateMemberRole(
        req.user!,
        String(req.params.id),
        req.body.role,
      );
      return sendSuccess(res, data, 'Member updated');
    } catch (err) {
      return next(err);
    }
  };

  removeMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await organizationService.removeMember(req.user!, String(req.params.id));
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  };
}

export const organizationController = new OrganizationController();

import { NextFunction, Request, Response } from 'express';
import { OrgStatus } from '@prisma/client';
import { adminService } from './admin.service';
import { sendSuccess } from '../../utils/response';

export class AdminController {
  stats = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      return sendSuccess(res, await adminService.stats());
    } catch (err) {
      return next(err);
    }
  };

  listOrgs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await adminService.listOrganizations({
        search: req.query.search as string | undefined,
        status: req.query.status as OrgStatus | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  };

  getOrg = async (req: Request, res: Response, next: NextFunction) => {
    try {
      return sendSuccess(res, await adminService.getOrganization(String(req.params.id)));
    } catch (err) {
      return next(err);
    }
  };

  updateOrgStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await adminService.updateOrganizationStatus(
        String(req.params.id),
        req.body.status as OrgStatus,
      );
      return sendSuccess(res, data, 'Organization status updated');
    } catch (err) {
      return next(err);
    }
  };

  listTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await adminService.listTransactions({
        organizationId: req.query.organizationId as string | undefined,
        status: req.query.status as string | undefined,
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  };
}

export const adminController = new AdminController();

import { NextFunction, Request, Response } from 'express';
import { planService } from './plan.service';
import { sendSuccess } from '../../utils/response';

export class PlanController {
  listPublic = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      return sendSuccess(res, await planService.listPublic());
    } catch (err) {
      return next(err);
    }
  };

  listAll = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      return sendSuccess(res, await planService.listAll());
    } catch (err) {
      return next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await planService.create(req.body);
      return sendSuccess(res, data, 'Plan created', 201);
    } catch (err) {
      return next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await planService.update(String(req.params.id), req.body);
      return sendSuccess(res, data, 'Plan updated');
    } catch (err) {
      return next(err);
    }
  };
}

export const planController = new PlanController();

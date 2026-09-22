import { NextFunction, Request, Response } from 'express';
import { paymentService } from './payment.service';
import { webhookService } from './webhook.service';
import { billingService } from './billing.service';
import { sendSuccess } from '../../utils/response';

export class PaymentController {
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await paymentService.startRegistration(req.body);
      return sendSuccess(res, data, 'Checkout session created', 201);
    } catch (err) {
      return next(err);
    }
  };

  retry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await paymentService.retryRegistrationCheckout(String(req.params.pendingId));
      return sendSuccess(res, data, 'Checkout session recreated');
    } catch (err) {
      return next(err);
    }
  };

  mySubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      return sendSuccess(res, await paymentService.getMySubscription(req.user!));
    } catch (err) {
      return next(err);
    }
  };

  upgrade = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await paymentService.createPlanChangeCheckout(
        req.user!,
        req.body.planId,
        'upgrade',
      );
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  };

  downgrade = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await paymentService.createPlanChangeCheckout(
        req.user!,
        req.body.planId,
        'downgrade',
      );
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await paymentService.cancelSubscription(req.user!);
      return sendSuccess(res, data, 'Subscription cancelled');
    } catch (err) {
      return next(err);
    }
  };

  payments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      return sendSuccess(res, await paymentService.listPayments(req.user!));
    } catch (err) {
      return next(err);
    }
  };

  transactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as string | undefined;
      return sendSuccess(res, await paymentService.listOrgTransactions(req.user!, status));
    } catch (err) {
      return next(err);
    }
  };

  billingPortal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await billingService.createPortalSession(req.user!);
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  };

  downloadInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const buffer = await billingService.downloadInvoice(
        req.user!,
        String(req.params.paymentId),
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="invoice-${req.params.paymentId}.pdf"`,
      );
      return res.send(buffer);
    } catch (err) {
      return next(err);
    }
  };

  stripeWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = webhookService.constructEvent(req);
      const result = await webhookService.handleEvent(event);
      return res.status(200).json({ received: true, ...result });
    } catch (err) {
      return next(err);
    }
  };
}

export const paymentController = new PaymentController();

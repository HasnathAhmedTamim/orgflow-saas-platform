import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorMiddleware, notFoundMiddleware } from './middlewares/error.middleware';
import authRoutes from './modules/auth/auth.routes';
import organizationRoutes from './modules/organizations/organization.routes';
import planRoutes from './modules/plans/plan.routes';
import adminRoutes from './modules/admin/admin.routes';
import paymentRoutes from './modules/payments/payment.routes';
import { paymentController } from './modules/payments/payment.controller';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );
  app.use(helmet());
  app.use(morgan(env.NODE_ENV === 'test' ? 'tiny' : 'dev'));
  app.use(cookieParser());

  // Stripe webhook needs raw body — mount BEFORE json parser
  app.post(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json' }),
    (req, _res, next) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = req.body as Buffer;
      next();
    },
    paymentController.stripeWebhook,
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'OrgFlow API healthy' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/organizations', organizationRoutes);
  app.use('/api/plans', planRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', paymentRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

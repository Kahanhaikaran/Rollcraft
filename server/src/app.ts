import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { asHttpError } from './lib/http.js';
import { healthRouter } from './routes/health.route.js';
import { authRouter } from './modules/auth/auth.route.js';
import { itemsRouter } from './modules/items/items.route.js';
import { stockRouter } from './modules/stock/stock.route.js';
import { purchasesRouter } from './modules/purchases/purchases.route.js';
import { transfersRouter } from './modules/transfers/transfers.route.js';
import { attendanceRouter } from './modules/attendance/attendance.route.js';
import { kitchensRouter } from './modules/kitchens/kitchens.route.js';
import { payrollRouter } from './modules/payroll/payroll.route.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  app.use(
    cors({
      origin: env.APP_ORIGIN,
      credentials: true,
    }),
  );
  app.use(helmet());
  app.use(pinoHttp());
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/', (req, res) => {
    res.json({ ok: true, service: 'rollcraft-server' });
  });

  app.use(healthRouter);
  app.use(authRouter);
  app.use(itemsRouter);
  app.use(stockRouter);
  app.use(purchasesRouter);
  app.use(transfersRouter);
  app.use(attendanceRouter);
  app.use(kitchensRouter);
  app.use(payrollRouter);

  // 404
  app.use((req, res) => {
    res.status(404).json({ ok: false, error: 'NotFound' });
  });

  // Error handler
  app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const httpErr = asHttpError(err);
    if (httpErr) {
      return res.status(httpErr.status).json({ ok: false, error: httpErr.code, message: httpErr.message, details: httpErr.details });
    }

    req.log?.error({ err }, 'Unhandled error');
    return res.status(500).json({ ok: false, error: 'InternalServerError' });
  });

  return app;
}


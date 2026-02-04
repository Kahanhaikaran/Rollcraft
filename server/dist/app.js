import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
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
import { dashboardRouter } from './modules/dashboard/dashboard.route.js';
const apiLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'TooManyRequests', message: 'Too many requests, try again later' },
});
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.RATE_LIMIT_LOGIN_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'TooManyRequests', message: 'Too many login attempts' },
});
export function createApp() {
    const app = express();
    app.disable('x-powered-by');
    app.use(cors({
        origin: env.APP_ORIGIN,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));
    app.use(helmet({
        contentSecurityPolicy: env.NODE_ENV === 'production',
        crossOriginEmbedderPolicy: false,
        hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    }));
    app.use(pinoHttp());
    app.use(express.json({ limit: '1mb' }));
    app.use(cookieParser());
    app.use(apiLimiter);
    app.get('/', (req, res) => {
        res.json({ ok: true, service: 'rollcraft-server' });
    });
    app.use('/auth/login', loginLimiter);
    app.use(healthRouter);
    app.use(authRouter);
    app.use(itemsRouter);
    app.use(stockRouter);
    app.use(purchasesRouter);
    app.use(transfersRouter);
    app.use(attendanceRouter);
    app.use(kitchensRouter);
    app.use(payrollRouter);
    app.use(dashboardRouter);
    // 404
    app.use((req, res) => {
        res.status(404).json({ ok: false, error: 'NotFound' });
    });
    // Error handler
    app.use((err, req, res, _next) => {
        const httpErr = asHttpError(err);
        if (httpErr) {
            const payload = {
                ok: false,
                error: httpErr.code,
                message: env.NODE_ENV === 'production' && httpErr.status >= 500 ? 'Internal server error' : httpErr.message,
            };
            if (env.NODE_ENV !== 'production' && httpErr.details)
                payload.details = httpErr.details;
            return res.status(httpErr.status).json(payload);
        }
        req.log?.error({ err }, 'Unhandled error');
        return res.status(500).json({
            ok: false,
            error: 'InternalServerError',
            message: env.NODE_ENV === 'production' ? 'Internal server error' : String(err),
        });
    });
    return app;
}
//# sourceMappingURL=app.js.map
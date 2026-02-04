import { Router } from 'express';
export const healthRouter = Router();
healthRouter.get('/health', (req, res) => {
    res.json({
        ok: true,
        service: 'rollcraft-server',
        now: new Date().toISOString(),
    });
});
//# sourceMappingURL=health.route.js.map
import pino from 'pino';
import { env } from './config/env.js';
import { createApp } from './app.js';
const log = pino({ level: env.NODE_ENV === 'production' ? 'info' : 'debug' });
const app = createApp();
app.listen(env.PORT, () => {
    log.info({ port: env.PORT, nodeEnv: env.NODE_ENV }, 'Server listening');
});
//# sourceMappingURL=server.js.map
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  APP_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().min(3600).default(60 * 60 * 24 * 30),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(60000).default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(10).default(200),
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().min(3).default(10),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);


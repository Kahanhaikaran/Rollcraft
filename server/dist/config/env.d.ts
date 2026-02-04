import { z } from 'zod';
declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    PORT: z.ZodDefault<z.ZodNumber>;
    APP_ORIGIN: z.ZodDefault<z.ZodString>;
    DATABASE_URL: z.ZodString;
    JWT_ACCESS_SECRET: z.ZodString;
    JWT_REFRESH_SECRET: z.ZodString;
    JWT_ACCESS_TTL_SECONDS: z.ZodDefault<z.ZodNumber>;
    JWT_REFRESH_TTL_SECONDS: z.ZodDefault<z.ZodNumber>;
    RATE_LIMIT_WINDOW_MS: z.ZodDefault<z.ZodNumber>;
    RATE_LIMIT_MAX: z.ZodDefault<z.ZodNumber>;
    RATE_LIMIT_LOGIN_MAX: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "test" | "production";
    PORT: number;
    APP_ORIGIN: string;
    DATABASE_URL: string;
    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;
    JWT_ACCESS_TTL_SECONDS: number;
    JWT_REFRESH_TTL_SECONDS: number;
    RATE_LIMIT_WINDOW_MS: number;
    RATE_LIMIT_MAX: number;
    RATE_LIMIT_LOGIN_MAX: number;
}, {
    DATABASE_URL: string;
    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;
    NODE_ENV?: "development" | "test" | "production" | undefined;
    PORT?: number | undefined;
    APP_ORIGIN?: string | undefined;
    JWT_ACCESS_TTL_SECONDS?: number | undefined;
    JWT_REFRESH_TTL_SECONDS?: number | undefined;
    RATE_LIMIT_WINDOW_MS?: number | undefined;
    RATE_LIMIT_MAX?: number | undefined;
    RATE_LIMIT_LOGIN_MAX?: number | undefined;
}>;
export type Env = z.infer<typeof envSchema>;
export declare const env: Env;
export {};
//# sourceMappingURL=env.d.ts.map
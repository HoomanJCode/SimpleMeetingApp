import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('localhost'),
  AUTH_METHOD: z.enum(['google', 'userpass']).default('google'),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_REDIRECT_URI: z.string().url().optional().default('http://localhost:3001/api/auth/google/callback'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRATION: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRATION: z.string().default('30d'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  FRONTEND_BUILD_PATH: z.string().default('./frontend/dist'),
  DATABASE_PATH: z.string().default('./data/irmeeting.db'),
}).refine(
  (data) => {
    if (data.AUTH_METHOD === 'google') {
      return data.GOOGLE_CLIENT_ID.length > 0 && data.GOOGLE_CLIENT_SECRET.length > 0;
    }
    return true;
  },
  { message: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required when AUTH_METHOD=google' }
);

export type Env = z.infer<typeof envSchema>;

let env: Env;

export function loadEnv(): Env {
  if (!env) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error('❌ Invalid environment variables:');
      console.error(result.error.flatten().fieldErrors);
      process.exit(1);
    }
    env = result.data;
  }
  return env;
}

export function getEnv(): Env {
  if (!env) {
    return loadEnv();
  }
  return env;
}

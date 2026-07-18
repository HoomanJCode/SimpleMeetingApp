import pino from 'pino';
import { getEnv } from '../config/env';

const env = getEnv();

const isProduction = env.NODE_ENV === 'production';
const isTest = env.NODE_ENV === 'test';

export const logger = pino({
  level: isTest ? 'silent' : isProduction ? 'info' : 'debug',
  transport:
    !isProduction && !isTest
      ? {
          target: 'pino/file',
          options: { destination: 1 }, // stdout
        }
      : undefined,
});

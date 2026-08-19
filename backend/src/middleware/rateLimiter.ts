import rateLimit from 'express-rate-limit';

// Rate limiting is a production concern. In dev/test mode (ENABLE_TEST_ROUTES=1)
// the E2E suite runs dozens of sequential requests per test from one origin and
// would trip these limits constantly, so both limiters stand down entirely.
const skipInTestMode = () => process.env.ENABLE_TEST_ROUTES === '1';

/**
 * General API rate limiter: 100 requests per minute.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  skip: skipInTestMode,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later.',
    },
  },
});

/**
 * Strict rate limiter for auth endpoints: 10 requests per minute.
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  skip: skipInTestMode,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many auth attempts, please try again in a minute.',
    },
  },
});

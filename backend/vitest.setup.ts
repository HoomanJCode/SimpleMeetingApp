// Set test environment variables BEFORE any modules are imported
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.HOST = 'localhost';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-chars-long!!';
process.env.JWT_EXPIRATION = '15m';
process.env.REFRESH_TOKEN_EXPIRATION = '30d';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3001/api/auth/google/callback';
process.env.DATABASE_PATH = ':memory:';

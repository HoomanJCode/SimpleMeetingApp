# Authentication: Google OAuth + JWT

## Overview

Users authenticate exclusively via Google OAuth 2.0. No email/password system. After OAuth, the backend issues a short-lived JWT access token and a long-lived refresh token.

## Flow

```
┌──────────────────────────────────────────────────────────────┐
│                        AUTH FLOW                             │
│                                                              │
│  1. User clicks "Sign in with Google"                        │
│     │                                                        │
│     ▼                                                        │
│  2. Frontend redirects to /api/auth/google                   │
│     │                                                        │
│     ▼                                                        │
│  3. Backend redirects to Google OAuth consent screen         │
│     │                                                        │
│     ▼                                                        │
│  4. User grants permissions to Google                        │
│     │                                                        │
│     ▼                                                        │
│  5. Google redirects back to /api/auth/google/callback       │
│     with authorization code                                  │
│     │                                                        │
│     ▼                                                        │
│  6. Backend exchanges code for Google tokens                 │
│     - Gets user profile (id, email, name, picture)           │
│     - Creates/updates user record in DB                      │
│     - Generates JWT access token (15 min)                    │
│     - Generates refresh token (30 days)                      │
│     - Stores refresh token in DB                             │
│     │                                                        │
│     ▼                                                        │
│  7. Backend redirects to frontend callback URL:              │
│     /auth/callback?token=<jwt>&refreshToken=<refresh>        │
│     │                                                        │
│     ▼                                                        │
│  8. Frontend stores tokens in memory                         │
│     - Redirects user to home page                            │
└──────────────────────────────────────────────────────────────┘
```

## JWT Structure

### Access Token
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-uuid",
    "email": "user@gmail.com",
    "name": "John Doe",
    "avatarUrl": "https://...",
    "iat": 1754044800,
    "exp": 1754045700
  }
}
```

- **Algorithm**: HS256 (HMAC-SHA256)
- **Expiration**: 15 minutes
- **Secret**: From `JWT_SECRET` environment variable
- **Stored**: In-memory (React state/context), never in localStorage

### Refresh Token
- **Format**: Cryptographically random 64-byte hex string (`crypto.randomBytes(64).toString('hex')`)
- **Expiration**: 30 days
- **Stored**: In HTTP-only cookie (`refreshToken`) OR in memory (client preference)
- **Storage**: Hashed in `refresh_tokens` table

## Token Refresh Flow

```
  1. API call returns 401 (token expired)
     │
     ▼
  2. Frontend interceptor catches 401
     │
     ▼
  3. Calls POST /api/auth/refresh with refresh token
     │
     ▼
  4. Backend validates refresh token:
     - Checks token exists in DB
     - Checks not expired
     - Generates new access token
     - (Optional) Rotates refresh token
     │
     ▼
  5. Frontend retries original request with new token
```

## Backend Middleware

### `authenticate` middleware
```typescript
// Applied to protected routes
// 1. Extracts Bearer token from Authorization header
// 2. Verifies JWT signature and expiration
// 3. Attaches user object to request
// 4. Returns 401 if invalid
```

### `optionalAuth` middleware
```typescript
// Applied to public routes that show extra data for logged-in users
// (e.g., GET /meetings/:id returns isJoined when authenticated)
// 1. Attempts authentication but doesn't fail if no token
// 2. Attaches user if valid token, otherwise req.user = null
```

## Frontend Auth Context

```typescript
// React Context providing:
// - user: User | null
// - isLoading: boolean
// - login(): Redirects to Google OAuth
// - logout(): Clears tokens, redirects to home
// - getToken(): Returns current JWT for API calls

// Token stored in a module-level variable (not state, not localStorage)
let accessToken: string | null = null;
```

## Environment Variables

```env
# Backend .env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
JWT_SECRET=<random-64-char-string>
JWT_EXPIRATION=15m
REFRESH_TOKEN_EXPIRATION=30d
FRONTEND_URL=http://localhost:5173
```

## Security Notes

- **No localStorage for tokens**: Prevents XSS token theft. Use memory-only storage.
- **HTTP-only cookies for refresh tokens**: Not accessible via JavaScript.
- **CSRF protection**: Since we use `Authorization: Bearer` header (not cookies for access tokens), CSRF is inherently mitigated for API calls.
- **Token rotation**: Each refresh invalidates the old refresh token (prevents replay).
- **Google OAuth state parameter**: Must verify `state` parameter to prevent CSRF on OAuth callback.

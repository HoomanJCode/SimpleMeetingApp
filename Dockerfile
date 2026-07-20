# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN cd backend && npm ci
RUN cd frontend && npm ci

# Copy source code
COPY backend ./backend
COPY frontend ./frontend

# Build frontend
RUN cd frontend && npm run build

# Build backend
RUN cd backend && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy backend production dependencies
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist

# Copy frontend build
COPY --from=builder /app/frontend/dist ./frontend/dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
ENV FRONTEND_BUILD_PATH=/app/frontend/dist

EXPOSE 3001

WORKDIR /app/backend

# Create a writable data directory for SQLite and ensure the node user owns it
RUN mkdir -p /app/data && chown -R node:node /app/data
ENV DATABASE_PATH=/app/data/irmeeting.db

USER node

CMD ["node", "dist/index.js"]

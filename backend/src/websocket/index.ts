import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { getEnv } from '../config/env';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';

let io: Server | null = null;

/**
 * Creates and configures the Socket.IO server.
 * Must be called once during server startup.
 */
export function createWebSocketServer(httpServer: HttpServer): Server {
  const env = getEnv();

  io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60_000,
    pingInterval: 25_000,
  });

  // Authentication middleware (optional — allows unauthenticated connections)
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;

    if (token) {
      const payload = verifyAccessToken(token);
      if (payload) {
        socket.data.user = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          avatarUrl: payload.avatarUrl,
        };
      }
    }

    next();
  });

  io.on('connection', (socket: Socket) => {
    logger.info({ socketId: socket.id }, 'WebSocket client connected');

    // Join global room for meeting creation/deletion events
    socket.join('global');

    // Subscribe to meeting room
    socket.on('meeting:subscribe', ({ meetingId }: { meetingId: string }, callback?: () => void) => {
      if (meetingId) {
        socket.join(`meeting:${meetingId}`);
        logger.debug({ socketId: socket.id, meetingId }, 'Client subscribed to meeting');
        if (typeof callback === 'function') {
          callback();
        }
      }
    });

    // Unsubscribe from meeting room
    socket.on('meeting:unsubscribe', ({ meetingId }: { meetingId: string }) => {
      if (meetingId) {
        socket.leave(`meeting:${meetingId}`);
        logger.debug({ socketId: socket.id, meetingId }, 'Client unsubscribed from meeting');
      }
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'WebSocket client disconnected');
    });
  });

  logger.info('WebSocket server initialized');
  return io;
}

/**
 * Returns the Socket.IO server instance.
 * Throws if called before createWebSocketServer.
 */
export function getIO(): Server {
  if (!io) {
    throw new Error('WebSocket server not initialized. Call createWebSocketServer first.');
  }
  return io;
}

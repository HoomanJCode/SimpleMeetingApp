import { Router } from 'express';
import { healthRouter } from './health.routes';
import { authRouter } from './auth.routes';
import { meetingRouter } from './meeting.routes';

const router = Router();

// Health check
router.use('/health', healthRouter);

// Authentication
router.use('/auth', authRouter);

// Meetings
router.use('/meetings', meetingRouter);

export default router;

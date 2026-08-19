import { Router } from 'express';
import { healthRouter } from './health.routes';
import { authRouter } from './auth.routes';
import { meetingRouter } from './meeting.routes';
import { tagRouter } from './tag.routes';
import testRouter from './test.routes';

const router = Router();

// Health check
router.use('/health', healthRouter);

// Authentication
router.use('/auth', authRouter);

// Meetings
router.use('/meetings', meetingRouter);

// Tags
router.use('/tags', tagRouter);

// Dev/test-only routes for E2E seeding (returns 404 in production)
router.use('/test', testRouter);

export default router;

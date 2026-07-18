import { Router } from 'express';
import { healthRouter } from './health.routes';
import { authRouter } from './auth.routes';

const router = Router();

// Health check
router.use('/health', healthRouter);

// Authentication
router.use('/auth', authRouter);

// router.use('/meetings', meetingRouter);

export default router;

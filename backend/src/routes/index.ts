import { Router } from 'express';
import { healthRouter } from './health.routes';

const router = Router();

// Health check
router.use('/health', healthRouter);

// More routes will be added here:
// router.use('/auth', authRouter);
// router.use('/meetings', meetingRouter);

export default router;

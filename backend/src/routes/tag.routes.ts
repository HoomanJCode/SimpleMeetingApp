import { Router } from 'express';
import { getAllTags } from '../services/meetingService';

export const tagRouter = Router();

/**
 * GET /tags
 * Public: lists all available meeting tags.
 */
tagRouter.get('/', (_req, res) => {
  res.json({ tags: getAllTags() });
});

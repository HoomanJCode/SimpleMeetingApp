import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { optionalAuth } from '../middleware/optionalAuth';
import { validate } from '../middleware/validate';
import { createMeetingSchema, updateMeetingSchema, meetingQuerySchema } from '../services/meetingSchemas';
import {
  createMeeting,
  getMeetings,
  getMeetingById,
  updateMeeting,
  cancelMeeting,
  joinMeeting,
  leaveMeeting,
  getParticipants,
  getUserMeetings,
} from '../services/meetingService';

export const meetingRouter = Router();

/**
 * GET /meetings/my
 * Protected: gets meetings created or joined by current user.
 * MUST be defined before /:id so 'my' is not caught as an ID param.
 */
meetingRouter.get('/my', authenticate, (req: Request, res: Response) => {
  const result = getUserMeetings(req.user!.id);
  res.json(result);
});

/**
 * GET /meetings
 * Public: lists meetings with optional filters and pagination.
 * Optionally includes user-specific join status if authenticated.
 */
meetingRouter.get(
  '/',
  optionalAuth,
  validate({ query: meetingQuerySchema }),
  (req: Request, res: Response) => {
    const { page, limit, search, status } = req.query as any;
    const userId = req.user?.id;

    const result = getMeetings({ page, limit, search, status }, userId);

    res.json({
      meetings: result.data,
      pagination: result.pagination,
    });
  }
);

/**
 * POST /meetings
 * Protected: creates a new meeting. User becomes host.
 */
meetingRouter.post(
  '/',
  authenticate,
  validate({ body: createMeetingSchema }),
  (req: Request, res: Response) => {
    const meeting = createMeeting(req.body, req.user!.id);
    res.status(201).json(meeting);
  }
);

/**
 * GET /meetings/:id
 * Public: gets meeting details. Optionally includes join status and participant list.
 */
meetingRouter.get('/:id', optionalAuth, (req: Request, res: Response) => {
  const id = req.params.id as string;
  const meeting = getMeetingById(id, req.user?.id);
  const participants = getParticipants(id);

  res.json({
    ...meeting,
    participants,
  });
});

/**
 * PUT /meetings/:id
 * Protected: updates meeting (host only).
 */
meetingRouter.put(
  '/:id',
  authenticate,
  validate({ body: updateMeetingSchema }),
  (req: Request, res: Response) => {
    const id = req.params.id as string;
    const meeting = updateMeeting(id, req.user!.id, req.body);
    res.json(meeting);
  }
);

/**
 * POST /meetings/:id/cancel
 * Protected: cancels a meeting (host only). Sets status to 'cancelled'.
 * Meetings are never permanently deleted.
 */
meetingRouter.post('/:id/cancel', authenticate, (req: Request, res: Response) => {
  const id = req.params.id as string;
  const meeting = cancelMeeting(id, req.user!.id);
  res.json(meeting);
});

/**
 * POST /meetings/:id/join
 * Protected: joins a meeting as participant.
 */
meetingRouter.post('/:id/join', authenticate, (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = joinMeeting(id, req.user!.id);
  res.json({ message: 'Successfully joined', ...result });
});

/**
 * POST /meetings/:id/leave
 * Protected: leaves a meeting.
 */
meetingRouter.post('/:id/leave', authenticate, (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = leaveMeeting(id, req.user!.id);
  res.json({ message: 'Successfully left', ...result });
});

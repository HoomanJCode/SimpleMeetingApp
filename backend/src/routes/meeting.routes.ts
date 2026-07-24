import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/authenticate';
import { optionalAuth } from '../middleware/optionalAuth';
import { validate } from '../middleware/validate';
import { createMeetingSchema, updateMeetingSchema, meetingQuerySchema } from '../services/meetingSchemas';
import {
  createMeeting,
  getMeetings,
  getMeetingById,
  getMeetingByIdWithPhotos,
  updateMeeting,
  cancelMeeting,
  joinMeeting,
  leaveMeeting,
  getParticipants,
  getUserMeetings,
  addMeetingPhoto,
  deleteMeetingPhoto,
} from '../services/meetingService';

export const meetingRouter = Router();

// ---- Multer config for photo uploads ----
const uploadsDir = path.resolve(process.cwd(), 'uploads/meetings');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const id = crypto.randomUUID?.() ?? Date.now().toString(36);
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, jpeg, png, gif, webp) are allowed'));
    }
  },
});

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
 * Public: gets meeting details. Optionally includes join status, participant list, and photos.
 */
meetingRouter.get('/:id', optionalAuth, (req: Request, res: Response) => {
  const id = req.params.id as string;
  const meeting = getMeetingByIdWithPhotos(id, req.user?.id);
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

/**
 * POST /meetings/:id/photos
 * Protected: uploads a photo to a meeting gallery (host only).
 */
meetingRouter.post('/:id/photos', authenticate, upload.single('photo'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!req.file) {
      res.status(400).json({ error: { code: 'NO_FILE', message: 'No image file provided' } });
      return;
    }
    const url = `/uploads/meetings/${req.file.filename}`;
    const photo = addMeetingPhoto(id, req.user!.id, url);
    res.status(201).json(photo);
  } catch (err) {
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    next(err);
  }
});

/**
 * DELETE /meetings/:id/photos/:photoId
 * Protected: deletes a photo from a meeting gallery (host only).
 */
meetingRouter.delete('/:id/photos/:photoId', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const photoId = req.params.photoId as string;
    const photo = deleteMeetingPhoto(id, photoId, req.user!.id);
    // Delete the actual file from disk
    const filePath = path.resolve(process.cwd(), photo.url.replace(/^\//, ''));
    fs.unlink(filePath, () => {});
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

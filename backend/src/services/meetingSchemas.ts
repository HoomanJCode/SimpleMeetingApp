import { z } from 'zod';

export const createMeetingSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must be under 200 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description must be under 5000 characters'),
  dateTime: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date > new Date();
  }, 'dateTime must be a valid ISO 8601 date in the future'),
  location: z.string().min(2, 'Location must be at least 2 characters').max(300, 'Location must be under 300 characters'),
  capacity: z.number().int('Capacity must be a whole number').min(2, 'Minimum capacity is 2').max(10000, 'Maximum capacity is 10000'),
});

export const updateMeetingSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  dateTime: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'dateTime must be a valid ISO 8601 date').optional(),
  location: z.string().min(2).max(300).optional(),
  capacity: z.number().int().min(2).max(10000).optional(),
  status: z.enum(['upcoming', 'ongoing', 'ended', 'cancelled']).optional(),
});

export const meetingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().optional(),
  status: z.enum(['upcoming', 'ongoing', 'ended', 'cancelled']).optional(),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
export type MeetingQuery = z.infer<typeof meetingQuerySchema>;

import { describe, it, expect } from 'vitest';
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from './errors';

describe('Error classes', () => {
  it('AppError base class sets statusCode and code', () => {
    const err = new AppError(418, 'TEAPOT', "I'm a teapot");
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe('TEAPOT');
    expect(err.message).toBe("I'm a teapot");
    expect(err.name).toBe('AppError');
  });

  it('NotFoundError has status 404', () => {
    const err = new NotFoundError('Meeting');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Meeting not found');
  });

  it('UnauthorizedError has status 401', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('ForbiddenError has status 403', () => {
    const err = new ForbiddenError('Nope');
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
    expect(err.message).toBe('Nope');
  });

  it('ConflictError has status 409', () => {
    const err = new ConflictError('Already exists');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });

  it('ValidationError has status 400 and details', () => {
    const err = new ValidationError({ title: 'Required' });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual({ title: 'Required' });
  });
});

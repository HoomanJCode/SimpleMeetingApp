import { getDb } from './connection';
import { logger } from '../utils/logger';

/**
 * Inserts development seed data.
 * Skips if data already exists.
 */
export function seedDatabase(): void {
  const db = getDb();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as {
    count: number;
  };

  if (userCount.count > 0) {
    logger.info('Database already seeded, skipping');
    return;
  }

  logger.info('Seeding database with sample data');

  db.exec(`
    -- Sample users
    INSERT INTO users (id, google_id, email, name, avatar_url) VALUES
    ('u1', 'g-111', 'alice@gmail.com', 'Alice Johnson', NULL),
    ('u2', 'g-222', 'bob@gmail.com', 'Bob Smith', NULL),
    ('u3', 'g-333', 'charlie@gmail.com', 'Charlie Brown', NULL);

    -- Sample meetings
    INSERT INTO meetings (id, host_id, title, description, date_time, location, capacity) VALUES
    ('m1', 'u1', 'React Nerds Meetup', 'Monthly discussion for React enthusiasts covering hooks, state management, and the latest features in React 19.', '2026-08-01T18:00:00Z', 'Tehran Coworking Hub', 30),
    ('m2', 'u2', 'TypeScript Workshop', 'Hands-on TypeScript workshop for beginners. Bring your laptop! We will cover types, interfaces, generics, and utility types.', '2026-08-05T14:00:00Z', 'Online (Zoom)', 20),
    ('m3', 'u3', 'Node.js Performance', 'Deep dive into Node.js performance optimization. Topics include event loop, clustering, memory profiling, and caching strategies.', '2026-08-10T19:00:00Z', 'Startup Cafe', 15);

    -- Sample participants
    INSERT INTO participants (meeting_id, user_id) VALUES
    ('m1', 'u2'),
    ('m1', 'u3'),
    ('m2', 'u1'),
    ('m2', 'u3');
  `);

  logger.info('Database seeded successfully');
}

/**
 * Reusable test users for E2E specs. These are seeded into the DB via
 * the dev-only `/api/test/login` endpoint before the relevant test runs.
 *
 * IDs are stable so spec assertions can reference them across runs.
 */
export interface TestUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export const testUsers = {
  /** Alice: hosts meetings in most specs. */
  alice: {
    id: 'test-user-alice',
    email: 'alice@test.local',
    name: 'Alice Host',
    avatarUrl: null,
  },
  /** Bob: a typical participant. */
  bob: {
    id: 'test-user-bob',
    email: 'bob@test.local',
    name: 'Bob Participant',
    avatarUrl: null,
  },
  /** Charlie: a secondary participant used in capacity / multi-user tests. */
  charlie: {
    id: 'test-user-charlie',
    email: 'charlie@test.local',
    name: 'Charlie Observer',
    avatarUrl: null,
  },
} as const satisfies Record<string, TestUser>;

export type TestUserKey = keyof typeof testUsers;

/** A preset user can be passed to helpers by its key (e.g. `'alice'`). */
export type TestUserLike = TestUser | TestUserKey;

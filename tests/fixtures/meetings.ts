/**
 * Reusable meeting templates for E2E specs.
 *
 * Date helpers compute times relative to the moment the test runs so
 * specs remain stable regardless of when they execute.
 */

export interface TestMeetingDraft {
  title: string;
  description: string;
  location: string;
  capacity: number;
}

/** Returns an ISO date string `daysFromNow` days in the future. */
export function futureDateTime(daysFromNow = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(18, 0, 0, 0);
  return d.toISOString();
}

/** Returns an ISO date string `daysAgo` days in the past. */
export function pastDateTime(daysAgo = 7): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(18, 0, 0, 0);
  return d.toISOString();
}

/** A baseline upcoming meeting that meets backend validation. */
export const validMeeting: TestMeetingDraft = {
  title: 'Test Tech Meetup',
  description: 'A standard test meeting used by E2E specs.',
  location: 'Online (Test)',
  capacity: 10,
};

/** A small meeting close to capacity for capacity-fence tests. */
export const smallMeeting: TestMeetingDraft = {
  title: 'Small Test Meetup',
  description: 'A low-capacity meeting used to reach capacity edge cases.',
  location: 'Online (Test)',
  capacity: 3,
};

/** Empty-string values for every text field plus a missing capacity,
 *  to exercise the form-validation rejection path. */
export const invalidMeetingBlankFields: Partial<TestMeetingDraft> = {
  title: '',
  description: '',
  location: '',
};

/** A plausible draft with an obviously invalid capacity to exercise
 *  the `capacity >= 2` validation. Backend rejects capacity < 2. */
export const invalidMeetingBadCapacity: TestMeetingDraft = {
  title: 'Bad Capacity Test',
  description: 'Should fail backend validation due to capacity=1.',
  location: 'Online (Test)',
  capacity: 1,
};

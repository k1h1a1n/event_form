/**
 * The value the Schedule control reads from and writes to the form.
 * Each part holds what the user has entered so far; whether it is valid is a separate question
 * (see validators/schedule.validators.ts).
 */
export interface ScheduleValue {
  date: string; // 'YYYY-MM-DD' (or the text as typed, while it isn't a real date)
  startTime: string; // 'HH:mm' 24-hour (or the text as typed, while it isn't a real time)
  durationMinutes: number | null;
}

/** One message per part: what is wrong with it, or null if it is fine. */
export type ScheduleIssues = Record<keyof ScheduleValue, string | null>;

/** A schedule with nothing entered. The control reports it to the form as null. */
export const EMPTY_SCHEDULE: ScheduleValue = { date: '', startTime: '', durationMinutes: null };

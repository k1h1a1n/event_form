import { EMPTY_SCHEDULE, ScheduleIssues, ScheduleValue } from '../models/schedule.model';
import { isoDateToDate } from '../utils/date-time';

/** Longest event the schedule accepts: one day. */
const MAX_DURATION_MINUTES = 24 * 60;

/** 'HH:mm', 00:00 to 23:59: what a time input produces. */
const TIME_24H = /^([01]\d|2[0-3]):[0-5]\d$/;

/** No messages at all. */
export const NO_SCHEDULE_ISSUES: ScheduleIssues = {
  date: null,
  startTime: null,
  durationMinutes: null,
};

/** Returns what is wrong with the date, or null if it is fine. */
export function dateIssue(date: string): string | null {
  if (date === '') return 'Enter a date.';
  if (isoDateToDate(date) === null) return 'Enter a valid date.';
  return null;
}

/** Returns what is wrong with the start time, or null if it is fine. */
export function startTimeIssue(time: string): string | null {
  if (time === '') return 'Enter a start time.';
  if (!TIME_24H.test(time)) return 'Enter a valid time.';
  return null;
}

/** Returns what is wrong with the duration, or null if it is fine. */
export function durationIssue(minutes: number | null): string | null {
  if (minutes === null || Number.isNaN(minutes)) return 'Enter a duration.';
  if (!Number.isInteger(minutes)) return 'Use whole minutes.';
  if (minutes < 1) return 'The duration must be at least 1 minute.';
  if (minutes > MAX_DURATION_MINUTES) return 'An event can last at most 24 hours.';
  return null;
}

/** True when nothing has been entered at all. */
export function isScheduleEmpty(schedule: ScheduleValue | null): boolean {
  return (
    schedule === null ||
    (schedule.date === '' && schedule.startTime === '' && schedule.durationMinutes === null)
  );
}

/**
 * Every schedule rule at once: one message (or null) per part.
 *
 * An empty schedule has no issues unless it is `required`: that is up to the form using the
 * control (see event-setup.schema.ts). Once any part is entered, every part is needed.
 */
export function scheduleIssues(schedule: ScheduleValue | null, required = false): ScheduleIssues {
  if (isScheduleEmpty(schedule) && !required) return NO_SCHEDULE_ISSUES;
  schedule ??= EMPTY_SCHEDULE;
  return {
    date: dateIssue(schedule.date),
    startTime: startTimeIssue(schedule.startTime),
    durationMinutes: durationIssue(schedule.durationMinutes),
  };
}

/** True if any part has a problem. */
export function hasScheduleIssues(issues: ScheduleIssues): boolean {
  return Object.values(issues).some(Boolean);
}

/** When the schedule starts (its date at its start time), or null while either isn't valid. */
export function scheduleStart(schedule: ScheduleValue | null): Date | null {
  if (!schedule || dateIssue(schedule.date) || startTimeIssue(schedule.startTime)) return null;
  // 'YYYY-MM-DDTHH:mm' with no time zone is read as local time.
  return new Date(`${schedule.date}T${schedule.startTime}`);
}

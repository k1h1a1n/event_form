import { dateToIsoDate } from '../utils/date-time';
import { ScheduleValue } from './schedule.model';
import { TicketTier } from './ticket-tier.model';

/** The shape of the data the event setup form edits. */
export interface EventSetupModel {
  name: string;
  description: string;
  schedule: ScheduleValue | null; // null while nothing is entered
  ticketTiers: TicketTier[];
}

/**
 * The values the form starts with, and goes back to after Save or Reset.
 * A function, not a constant, so every call gives fresh objects (the form tags list items with
 * a tracking id, so they must never be shared) and the date is always a week from today.
 */
export function defaultEventSetup(): EventSetupModel {
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  return {
    name: 'Angular Meetup',
    description: 'An evening of short talks about Angular, followed by networking.',
    schedule: { date: dateToIsoDate(nextWeek), startTime: '18:30', durationMinutes: 90 },
    ticketTiers: [
      { label: 'Early bird', price: 499 },
      { label: 'Standard', price: 799 },
    ],
  };
}

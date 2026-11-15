import { ScheduleValue } from './schedule.model';
import { TicketTier } from './ticket-tier.model';

/** The shape of the data the event setup form edits. */
export interface EventSetupModel {
  name: string;
  description: string;
  schedule: ScheduleValue | null; // null while nothing is entered
  ticketTiers: TicketTier[];
}

/** A form with nothing entered: what the page starts with, and what Reset goes back to. */
export const EMPTY_EVENT_SETUP: EventSetupModel = {
  name: '',
  description: '',
  schedule: null,
  ticketTiers: [],
};
